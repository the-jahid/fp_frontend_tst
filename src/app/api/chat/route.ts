import { auth } from "@clerk/nextjs/server"

export const maxDuration = 300 // Set to 5 minutes (300 seconds) to allow buffer

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()

  // Extract the session ID from the request - this should be the active session ID
  const message = body.question || body.message
  const sessionId = body.overrideConfig?.sessionId || body.sessionId

  console.log("📤 API Route - Received request:")
  console.log("📋 Message:", message?.substring(0, 50) + "...")
  console.log("🆔 Session ID from frontend:", sessionId)
  console.log("🔗 This session ID will be passed to Flowise for conversation continuity")

  if (!sessionId) {
    console.error("❌ No session ID provided in request")
    return Response.json({ error: "Session ID is required" }, { status: 400 })
  }

  try {
    // Set timeout to 3 minutes (180 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes = 180,000ms

    console.log("⏱️ Starting Flowise API call with 3-minute timeout...")
    console.log("🎯 Using ACTIVE session ID for Flowise:", sessionId)
    const startTime = Date.now()

    // Use the ACTIVE session ID from the selected chat for Flowise synchronization
    const flowisePayload = {
      question: message,
      "overrideConfig": {
        "sessionId": sessionId
      } // Use the active session ID directly
    }

    console.log("📦 Flowise API Payload:", JSON.stringify(flowisePayload, null, 2))
    console.log("🔗 Flowise will use session ID:", sessionId, "for conversation memory")

    const response = await fetch("https://cloud.flowiseai.com/api/v1/prediction/9d92399f-0dbb-48ee-a119-cc808ff64621", {
      headers: {
        Authorization: "Bearer XGcYx_jZ814Pu4s94M7AiuCUp-Sju5V0sodm2kai-Uo",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(flowisePayload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    console.log(`⏱️ Flowise API completed in ${responseTime}ms (${(responseTime / 1000).toFixed(1)}s)`)
    console.log("✅ Flowise processed request with session ID:", sessionId)

    console.log("📥 Flowise Response Status:", response.status)
    console.log("📥 Flowise Response Headers:", Object.fromEntries(response.headers.entries()))

    // Check if response is successful
    if (!response.ok) {
      const errorText = await response.text()
      console.log("❌ Flowise API returned error status:", response.status)
      console.log("❌ Error response body:", errorText)

      // Handle specific error cases
      if (response.status === 504) {
        return Response.json(
          {
            message:
              "The AI service is taking longer than expected to generate the comprehensive medical assessment. This can happen with complex ECDS v5.0 evaluations. Please try again, or consider breaking down your request into smaller parts.",
            error: "Gateway timeout",
            sessionId: sessionId, // Return the session ID that was used
          },
          { status: 200 },
        )
      }

      if (response.status === 503) {
        return Response.json(
          {
            message: "The AI service is temporarily unavailable. Please try again in a few minutes.",
            error: "Service unavailable",
            sessionId: sessionId, // Return the session ID that was used
          },
          { status: 200 },
        )
      }

      return Response.json(
        {
          message: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
          error: `API error: ${response.status}`,
          sessionId: sessionId, // Return the session ID that was used
        },
        { status: 200 },
      )
    }

    // Check content type
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text()
      console.log("❌ Non-JSON response received:", textResponse.substring(0, 200))

      return Response.json(
        {
          message: "I received an unexpected response format. Please try rephrasing your question or try again later.",
          error: "Invalid response format",
          sessionId: sessionId, // Return the session ID that was used
        },
        { status: 200 },
      )
    }

    const result = await response.json()
    console.log("📥 Flowise API Response received")
    console.log("🔍 Response type:", typeof result)
    console.log("📊 Response keys:", Object.keys(result))

    // Extract the text response from Flowise
    const aiMessage =
      result.text || result.answer || result.message || result.response || "I'm sorry, I couldn't process your request."
    
    console.log("🤖 AI Message extracted:", aiMessage.substring(0, 100) + "...")
    console.log("✅ Successfully processed message for session:", sessionId)
    console.log("💾 Flowise has stored this conversation under session ID:", sessionId)

    return Response.json({
      message: aiMessage,
      rawResponse: result,
      responseTime: responseTime,
      sessionId: sessionId, // Confirm the session ID that was used
      syncedWithFlowise: true,
      flowiseSessionId: sessionId, // Explicitly show which session ID Flowise used
    })
  } catch (error) {
    // Use type guard for error
    const err = error as { name?: string; code?: string }
    console.error("❌ Flowise API error:", err)

    // Handle specific error types
    if (err.name === "AbortError") {
      return Response.json(
        {
          message:
            "The medical assessment took longer than 3 minutes to complete. This can happen with complex ECDS v5.0 evaluations. Please try again with a more specific question, or the service may be experiencing high demand.",
          error: "Request timeout after 3 minutes",
          responseTime: 180000,
          sessionId: sessionId, // Return the session ID that was attempted
        },
        { status: 200 },
      )
    }

    if (err.code === "ECONNREFUSED") {
      return Response.json(
        {
          message: "I'm unable to connect to the AI service right now. Please try again later.",
          error: "Connection refused",
          sessionId: sessionId, // Return the session ID that was attempted
        },
        { status: 200 },
      )
    }

    return Response.json(
      {
        message: "I'm experiencing technical difficulties. Please try again in a moment.",
        error: "Network error",
        sessionId: sessionId, // Return the session ID that was attempted
      },
      { status: 200 },
    )
  }
}
