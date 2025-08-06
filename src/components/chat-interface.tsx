"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserButton } from "@clerk/nextjs"
import { Send, Plus, ChevronDown, User, Menu, AlertTriangle, Activity, Stethoscope, Pill, Trash2, MoreHorizontal } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  sessionId: string
}

interface Session {
  id: string // This IS the session ID used for Flowise
  title: string
  active: boolean
  lastMessage?: string
  timestamp: string
  messageCount: number
}

interface StoredSessionData {
  sessions: Session[]
  messagesBySession: { [sessionId: string]: Message[] }
  currentSessionId: string
}

// Medical data interfaces
interface CriticalAction {
  priority: number
  condition: string
  action: string
  red_flag?: string
  evidence?: string
}

interface DiagnosisItem {
  diagnosis: string
  pre_test_probability: string
  discriminator?: string
  rule_out?: string
  features?: string
  classic?: string
}

interface DifferentialDiagnosis {
  tier_1_life_threats?: DiagnosisItem[]
  tier_2_urgent?: DiagnosisItem[]
  tier_3_common?: DiagnosisItem[]
}

interface ImmediateAssessment {
  patient: string
  complete_diagnosis?: {
    primary: string
    secondary?: string[]
    complications?: string[]
  }
}

interface WorkingDiagnosis {
  primary: string
  probability?: string
  active_problems?: string[]
}

interface TreatmentInterventions {
  [key: string]: string | boolean | number
}

interface SymptomControl {
  medication: string
  dose: string
  max_daily?: string
}

interface DefinitiveTreatment {
  medication?: string
  dose?: string
  route?: string
  duration?: string
}

interface TreatmentByProblem {
  problem: string
  definitive_treatment?: DefinitiveTreatment
  interventions?: TreatmentInterventions
  symptom_control?: SymptomControl
}

interface Disposition {
  admit_if?: string[]
  discharge_if_all?: string[]
}

interface DischargeInstructionItem {
  symptom?: string
  concern?: string
  provider?: string
  test?: string
  timeframe?: string
  condition?: string
}

interface DischargeInstructions {
  return_immediately?: DischargeInstructionItem[]
  follow_up?: DischargeInstructionItem[]
}

interface MedicalAssessmentData {
  immediate_assessment?: ImmediateAssessment
  critical_actions?: CriticalAction[]
  differential_diagnosis?: DifferentialDiagnosis
  working_diagnosis?: WorkingDiagnosis
  treatment_by_problem?: TreatmentByProblem[]
  disposition?: Disposition
  discharge_instructions?: DischargeInstructions
}

interface StoredMessage {
  id?: string
  content?: string
  message?: string
  role: string
  createdDate: string
  timestamp: string
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>("")
  const [messagesBySession, setMessagesBySession] = useState<{ [sessionId: string]: Message[] }>({})
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Generate unique session ID - this will be used for the ENTIRE conversation
  const generateSessionId = () => {
    // Create a UUID-like format similar to Flowise: d6bf107b-063d-4603-bba5-5a7a4d3aea7d
    const chars = '0123456789abcdef'
    const sections = [8, 4, 4, 4, 12]
    
    return sections.map(len => 
      Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    ).join('-')
  }

  // Load all session data from localStorage - moved inside component and wrapped in useCallback
  const loadStoredSessionData = useCallback((): StoredSessionData | null => {
    try {
      const storedData = localStorage.getItem("chatSessionData")
      if (storedData) {
        const parsed = JSON.parse(storedData) as StoredSessionData

        // Convert timestamp strings back to Date objects for messages
        if (parsed.messagesBySession) {
          Object.keys(parsed.messagesBySession).forEach((sessionId) => {
            parsed.messagesBySession[sessionId] = parsed.messagesBySession[sessionId].map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
          })
        }

        console.log("📂 Loaded session data:", {
          sessions: parsed.sessions?.length || 0,
          currentSession: parsed.currentSessionId,
          totalMessages: Object.values(parsed.messagesBySession || {}).flat().length,
        })

        return parsed
      }
    } catch (error) {
      console.log("⚠️ Error loading stored session data:", error)
    }
    return null
  }, [])

  // Save all session data to localStorage - wrapped in useCallback
  const saveSessionData = useCallback((sessionData: Partial<StoredSessionData>) => {
    try {
      const currentData = loadStoredSessionData() || {
        sessions: [],
        messagesBySession: {},
        currentSessionId: "",
      }

      const updatedData = {
        ...currentData,
        ...sessionData,
      }

      localStorage.setItem("chatSessionData", JSON.stringify(updatedData))
      console.log("💾 Session data saved:", {
        sessions: updatedData.sessions.length,
        currentSession: updatedData.currentSessionId,
        totalMessages: Object.values(updatedData.messagesBySession).flat().length,
      })
    } catch (error) {
      console.log("⚠️ Error saving session data:", error)
    }
  }, [loadStoredSessionData])

  // Create a new session - this creates ONE session ID that will be used for the ENTIRE conversation
  const createNewSession = useCallback(() => {
    const newSessionId = generateSessionId()
    console.log("🆕 NEW CHAT CLICKED - Creating session ID:", newSessionId)
    console.log("🔗 ALL future messages in this chat will use session ID:", newSessionId)
    console.log("💾 Flowise will remember this entire conversation using session ID:", newSessionId)

    const newSession: Session = {
      id: newSessionId,
      title: "New conversation",
      active: true,
      timestamp: new Date().toISOString(),
      messageCount: 0,
    }

    // Update sessions list - mark all others as inactive using functional updates
    setSessions(prevSessions => [newSession, ...prevSessions.map((s) => ({ ...s, active: false }))])

    // Initialize empty messages for this session using functional updates
    setMessagesBySession(prevMessages => ({
      ...prevMessages,
      [newSessionId]: [],
    }))

    // Update state
    setCurrentSessionId(newSessionId)
    setMessages([])

    // Save to localStorage - we need to get current values differently
    // Use setTimeout to ensure state updates have completed
    setTimeout(() => {
      const currentData = loadStoredSessionData() || {
        sessions: [],
        messagesBySession: {},
        currentSessionId: "",
      }
      
      saveSessionData({
        sessions: [newSession, ...currentData.sessions.map((s) => ({ ...s, active: false }))],
        messagesBySession: {
          ...currentData.messagesBySession,
          [newSessionId]: [],
        },
        currentSessionId: newSessionId,
      })
    }, 0)

    console.log("✅ New chat ready with permanent session ID:", newSessionId)
    console.log("📝 Ready to send messages - all will use the SAME session ID")
    return newSessionId
  }, [saveSessionData, loadStoredSessionData]) // Only depend on the memoized functions

  // Also wrap clearAllSessionData in useCallback
  const clearAllSessionData = useCallback(() => {
    try {
      console.log("🧹 Clearing all session data from localStorage...")
      localStorage.removeItem("chatSessionData")
      
      // Reset all state
      setSessions([])
      setMessagesBySession({})
      setMessages([])
      setCurrentSessionId("")
      
      console.log("✅ All session data cleared")
      
      // Create a fresh new session after a brief delay
      setTimeout(() => {
        const newSessionId = generateSessionId()
        const newSession: Session = {
          id: newSessionId,
          title: "New conversation",
          active: true,
          timestamp: new Date().toISOString(),
          messageCount: 0,
        }

        setSessions([newSession])
        setMessagesBySession({ [newSessionId]: [] })
        setCurrentSessionId(newSessionId)
        setMessages([])

        saveSessionData({
          sessions: [newSession],
          messagesBySession: { [newSessionId]: [] },
          currentSessionId: newSessionId,
        })
      }, 0)
    } catch (error) {
      console.error("❌ Error clearing session data:", error)
    }
  }, [saveSessionData]) // Remove createNewSession dependency

  // Initialize session management - runs once on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoadingHistory(true)
        console.log("🚀 Initializing session from localStorage...")

        // Load from localStorage
        const storedData = loadStoredSessionData()

        if (storedData && storedData.currentSessionId && storedData.sessions.length > 0) {
          console.log("📂 Found stored session data - current session ID:", storedData.currentSessionId)

          // Load the stored session
          const currentSession = storedData.sessions.find((s) => s.id === storedData.currentSessionId)
          const sessionMessages = storedData.messagesBySession[storedData.currentSessionId] || []

          if (currentSession) {
            // Set up the session
            setCurrentSessionId(storedData.currentSessionId)
            setSessions(storedData.sessions.map((s) => ({ ...s, active: s.id === storedData.currentSessionId })))
            setMessages(sessionMessages)
            setMessagesBySession(storedData.messagesBySession)

            console.log("✅ Session restored:", storedData.currentSessionId, "with", sessionMessages.length, "messages")
            console.log("🔗 All future messages will use session ID:", storedData.currentSessionId)
          } else {
            console.log("⚠️ Current session not found in stored sessions, creating new session")
            createNewSession()
          }
        } else {
          console.log("🆕 No stored session found, creating new session")
          createNewSession()
        }
      } catch (error) {
        console.error("❌ Error initializing session:", error)
        // Fallback: create new session
        createNewSession()
      } finally {
        setIsLoadingHistory(false)
      }
    }

    initializeSession()
  }, [loadStoredSessionData, createNewSession]) // Use the memoized functions

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !currentSessionId) return

    console.log("🎯 ACTIVE SESSION ID EXTRACTED:", currentSessionId)
    console.log("📤 User input:", input.trim())

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
      sessionId: currentSessionId,
    }

    console.log("👤 Creating user message:", userMessage)

    // Save the input before clearing it
    const currentInput = input.trim()
    setInput("")

    // Add user message to current messages state IMMEDIATELY
    const currentMessages = messagesBySession[currentSessionId] || []
    const updatedMessagesWithUser = [...currentMessages, userMessage]
    
    // Update the messages state immediately so user sees their message
    setMessages(updatedMessagesWithUser)
    
    // Update the messagesBySession state
    const updatedMessagesBySession = {
      ...messagesBySession,
      [currentSessionId]: updatedMessagesWithUser,
    }
    setMessagesBySession(updatedMessagesBySession)

    console.log("✅ User message added to UI - Total messages:", updatedMessagesWithUser.length)
    console.log("📊 Current messages:", updatedMessagesWithUser.map(m => `${m.role}: ${m.content.substring(0, 20)}...`))

    setIsLoading(true)

    try {
      console.log("🚀 Sending to API route with ACTIVE session ID:", currentSessionId)
      
      const apiPayload = {
        question: currentInput,
        overrideConfig: {
          sessionId: currentSessionId,
        },
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiPayload),
      })

      const data = await response.json()
      console.log("📥 API response received")

      if (response.ok) {
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          content: data.message,
          role: "assistant",
          timestamp: new Date(),
          sessionId: currentSessionId,
        }

        console.log("🤖 Creating assistant message:", assistantMessage)

        // Add assistant message to the existing messages (which already include the user message)
        const finalMessages = [...updatedMessagesWithUser, assistantMessage]
        setMessages(finalMessages)

        // Update messagesBySession with both user and assistant messages
        const finalMessagesBySession = {
          ...messagesBySession,
          [currentSessionId]: finalMessages,
        }
        setMessagesBySession(finalMessagesBySession)

        console.log("✅ Assistant message added - Total messages:", finalMessages.length)
        console.log("📊 Final messages:", finalMessages.map(m => `${m.role}: ${m.content.substring(0, 20)}...`))

        // Update session info
        const updatedSessions = sessions.map((session) =>
          session.id === currentSessionId
            ? {
                ...session,
                messageCount: finalMessages.length,
                lastMessage: currentInput.slice(0, 50) + (currentInput.length > 50 ? "..." : ""),
                timestamp: new Date().toISOString(),
                title: sessions.find(s => s.id === currentSessionId)?.title === "New conversation" 
                  ? currentInput.slice(0, 30) + (currentInput.length > 30 ? "..." : "")
                  : sessions.find(s => s.id === currentSessionId)?.title || "New conversation"
              }
            : session,
        )
        setSessions(updatedSessions)

        // Save everything to localStorage
        saveSessionData({
          sessions: updatedSessions,
          messagesBySession: finalMessagesBySession,
          currentSessionId,
        })

        console.log("💾 Session data saved successfully")
      } else {
        console.error("❌ Chat API error:", data.error)
        throw new Error(data.error || "Failed to get response")
      }
    } catch (error) {
      console.error("❌ Chat error:", error)
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: "I'm sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
        sessionId: currentSessionId,
      }
      
      // Add error message to existing messages
      const messagesWithError = [...updatedMessagesWithUser, errorMessage]
      setMessages(messagesWithError)
      
      const errorMessagesBySession = {
        ...messagesBySession,
        [currentSessionId]: messagesWithError,
      }
      setMessagesBySession(errorMessagesBySession)

      // Save error state
      saveSessionData({
        messagesBySession: errorMessagesBySession,
      })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Start new session - creates a NEW session ID for a NEW conversation
  const startNewSession = () => {
    console.log("🆕 User clicked 'New Chat' - creating new session...")
    createNewSession()
  }

  // Switch to existing session - uses the EXISTING session ID for that conversation
  const switchToSession = (sessionId: string) => {
    if (sessionId === currentSessionId) return

    console.log("🔄 SWITCHING TO ACTIVE SESSION:", sessionId)
    console.log("🎯 This session ID is now ACTIVE and will be sent to route.ts")
    console.log("🔗 Route.ts will pass this session ID to Flowise for conversation continuity")

    try {
      // Load messages from localStorage for this session
      const sessionMessages = messagesBySession[sessionId] || []

      // Update active session
      const updatedSessions = sessions.map((s) => ({
        ...s,
        active: s.id === sessionId,
      }))

      setCurrentSessionId(sessionId) // Set this as the ACTIVE session ID
      setSessions(updatedSessions)
      setMessages(sessionMessages)

      // Save current session to localStorage
      saveSessionData({
        sessions: updatedSessions,
        currentSessionId: sessionId,
      })

      // Close sidebar on mobile
      setSidebarOpen(false)

      console.log("✅ ACTIVE session is now:", sessionId, "with", sessionMessages.length, "messages")
      console.log("🎯 Next API call will use ACTIVE session ID:", sessionId)
    } catch (error) {
      console.error("❌ Error switching to active session:", error)
    }
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessionToDelete(session)
    setDeleteDialogOpen(true)
  }

  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setSessionToDelete(null)
    setIsDeleting(false)
  }

  // Confirm and execute deletion
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return

    setIsDeleting(true)
    
    try {
      console.log("🗑️ Starting deletion of session:", sessionToDelete.id)
      console.log("📊 Before deletion - Total sessions:", sessions.length)
      console.log("📊 Before deletion - Total message groups:", Object.keys(messagesBySession).length)

      // Remove from sessions and messages
      const updatedSessions = sessions.filter((s) => s.id !== sessionToDelete.id)
      const updatedMessagesBySession = { ...messagesBySession }
      
      // Completely delete the session's messages
      delete updatedMessagesBySession[sessionToDelete.id]
      
      console.log("📊 After deletion - Remaining sessions:", updatedSessions.length)
      console.log("📊 After deletion - Remaining message groups:", Object.keys(updatedMessagesBySession).length)
      console.log("✅ Session", sessionToDelete.id, "completely removed from memory")

      // Update state immediately
      setSessions(updatedSessions)
      setMessagesBySession(updatedMessagesBySession)

      // If we deleted the active session
      if (sessionToDelete.id === currentSessionId) {
        if (updatedSessions.length > 0) {
          // Switch to first available session
          const firstSession = updatedSessions[0]
          const firstSessionMessages = updatedMessagesBySession[firstSession.id] || []

          setCurrentSessionId(firstSession.id)
          setMessages(firstSessionMessages)

          // Mark first session as active
          const finalSessions = updatedSessions.map((s, index) => ({
            ...s,
            active: index === 0,
          }))
          setSessions(finalSessions)

          // Save updated state to localStorage
          const finalData = {
            sessions: finalSessions,
            messagesBySession: updatedMessagesBySession,
            currentSessionId: firstSession.id,
          }
        
          localStorage.setItem("chatSessionData", JSON.stringify(finalData))
          console.log("💾 localStorage updated - New active session:", firstSession.id)
          console.log("🔄 New ACTIVE session:", firstSession.id, "after deletion")
        } else {
          // Create new session if no sessions left
          console.log("🆕 No sessions left, creating new ACTIVE session...")
          
          // Clear localStorage completely and create fresh session
          localStorage.removeItem("chatSessionData")
          console.log("🧹 localStorage cleared completely")
          
          createNewSession()
        }
      } else {
        // Just save the updated sessions and messages (deleted session wasn't active)
        const finalData = {
          sessions: updatedSessions,
          messagesBySession: updatedMessagesBySession,
          currentSessionId: currentSessionId, // Keep current active session
        }
      
        localStorage.setItem("chatSessionData", JSON.stringify(finalData))
        console.log("💾 localStorage updated - Deleted inactive session:", sessionToDelete.id)
      }

      // Verify deletion in localStorage
      const storedData = localStorage.getItem("chatSessionData")
      if (storedData) {
        const parsed = JSON.parse(storedData) as StoredSessionData
        const sessionExists = parsed.sessions.some((s: Session) => s.id === sessionToDelete.id)
        const messagesExist = parsed.messagesBySession[sessionToDelete.id] !== undefined
      
        if (!sessionExists && !messagesExist) {
          console.log("✅ VERIFICATION: Session", sessionToDelete.id, "completely removed from localStorage")
        } else {
          console.error("❌ VERIFICATION FAILED: Session", sessionToDelete.id, "still exists in localStorage")
        }
      }

      console.log("✅ Session deletion completed successfully")
      
      // Small delay to show the loading state
      setTimeout(() => {
        closeDeleteDialog()
      }, 500)
      
    } catch (error) {
      console.error("❌ Error deleting session:", error)
      setIsDeleting(false)
    }
  }

  const renderAssistantMessage = (message: Message) => {
    console.log("🔍 Rendering message:", message.content.substring(0, 100))

    // Try to parse as JSON first
    let parsedData: MedicalAssessmentData | null = null
    let isJSON = false

    try {
      // Clean the message content - remove any markdown formatting
      let cleanContent = message.content.trim()

      // Remove \`\`\`json and \`\`\` if present
      if (cleanContent.startsWith("\`\`\`json")) {
        cleanContent = cleanContent.replace(/^\`\`\`json\s*/, "").replace(/\s*\`\`\`$/, "")
      } else if (cleanContent.startsWith("\`\`\`")) {
        cleanContent = cleanContent.replace(/^\`\`\`\s*/, "").replace(/\s*\`\`\`$/, "")
      }

      parsedData = JSON.parse(cleanContent) as MedicalAssessmentData
      isJSON = typeof parsedData === "object" && parsedData !== null
      console.log("✅ Successfully parsed JSON:", isJSON)
    } catch (error) {
      console.log("❌ JSON parsing failed:", error)
      isJSON = false
    }

    if (!isJSON || !parsedData) {
      // Plain text response - display in medical format
      return (
        <Card className="bg-gray-800 border-gray-600 w-full max-w-full overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">ECDS v5.0 - Emergency Clinical Decision Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-400 text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Clinical Assessment
              </h4>
              <div className="bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    // JSON response - display structured
    return (
      <Card className="bg-gray-800 border-gray-600 w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
            <Stethoscope className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">ECDS v5.0 - Emergency Clinical Decision Support</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {/* Immediate Assessment */}
          {parsedData.immediate_assessment && (
            <div className="space-y-3">
              <h4 className="font-semibold text-green-400 text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Immediate Assessment
              </h4>
              <div className="bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-sm text-gray-300 break-words font-medium mb-3">
                  {parsedData.immediate_assessment.patient}
                </p>
                {parsedData.immediate_assessment.complete_diagnosis && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-300 font-semibold">
                      Primary: {parsedData.immediate_assessment.complete_diagnosis.primary}
                    </p>
                    {parsedData.immediate_assessment.complete_diagnosis.secondary && (
                      <p className="text-xs text-gray-400">
                        Secondary: {parsedData.immediate_assessment.complete_diagnosis.secondary.join(", ")}
                      </p>
                    )}
                    {parsedData.immediate_assessment.complete_diagnosis.complications && (
                      <p className="text-xs text-gray-400">
                        Complications: {parsedData.immediate_assessment.complete_diagnosis.complications.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Critical Actions */}
          {parsedData.critical_actions && parsedData.critical_actions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-red-400 text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Actions
              </h4>
              <div className="space-y-3">
                {parsedData.critical_actions.map((action: CriticalAction, index: number) => (
                  <div key={index} className="bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="destructive" className="text-xs">
                        Priority {action.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300 break-words mb-2">
                      <span className="font-semibold text-red-300">Condition:</span> {action.condition}
                    </p>
                    <p className="text-sm text-gray-300 break-words mb-2">
                      <span className="font-semibold text-red-300">Action:</span> {action.action}
                    </p>
                    {action.red_flag && (
                      <p className="text-xs text-red-200">
                        <span className="font-semibold">Red Flag:</span> {action.red_flag}
                      </p>
                    )}
                    {action.evidence && (
                      <p className="text-xs text-gray-400 mt-1">
                        <span className="font-semibold">Evidence:</span> {action.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Differential Diagnosis */}
          {parsedData.differential_diagnosis && (
            <div className="space-y-3">
              <h4 className="font-semibold text-yellow-400 text-base">Differential Diagnosis</h4>
              <div className="space-y-4">
                {/* Tier 1 - Life Threats */}
                {parsedData.differential_diagnosis.tier_1_life_threats && (
                  <div>
                    <h5 className="text-sm font-semibold text-red-300 mb-2">Tier 1: Life Threats</h5>
                    <div className="space-y-2">
                      {parsedData.differential_diagnosis.tier_1_life_threats.map((threat: DiagnosisItem, index: number) => (
                        <div key={index} className="bg-red-900/10 p-3 rounded border-l-2 border-red-400">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-red-300 text-sm">{threat.diagnosis}</span>
                            <Badge variant="outline" className="text-xs">
                              {threat.pre_test_probability}
                            </Badge>
                          </div>
                          {threat.discriminator && (
                            <p className="text-xs text-gray-300">
                              <span className="font-semibold">Discriminator:</span> {threat.discriminator}
                            </p>
                          )}
                          {threat.rule_out && (
                            <p className="text-xs text-gray-300">
                              <span className="font-semibold">Rule out:</span> {threat.rule_out}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 2 - Urgent */}
                {parsedData.differential_diagnosis.tier_2_urgent && (
                  <div>
                    <h5 className="text-sm font-semibold text-orange-300 mb-2">Tier 2: Urgent</h5>
                    <div className="space-y-2">
                      {parsedData.differential_diagnosis.tier_2_urgent.map((urgent: DiagnosisItem, index: number) => (
                        <div key={index} className="bg-orange-900/10 p-3 rounded border-l-2 border-orange-400">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-orange-300 text-sm">{urgent.diagnosis}</span>
                            <Badge variant="outline" className="text-xs">
                              {urgent.pre_test_probability}
                            </Badge>
                          </div>
                          {urgent.features && (
                            <p className="text-xs text-gray-300">
                              <span className="font-semibold">Features:</span> {urgent.features}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 3 - Common */}
                {parsedData.differential_diagnosis.tier_3_common && (
                  <div>
                    <h5 className="text-sm font-semibold text-yellow-300 mb-2">Tier 3: Common</h5>
                    <div className="space-y-2">
                      {parsedData.differential_diagnosis.tier_3_common.map((common: DiagnosisItem, index: number) => (
                        <div key={index} className="bg-yellow-900/10 p-3 rounded border-l-2 border-yellow-400">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-yellow-300 text-sm">{common.diagnosis}</span>
                            <Badge variant="outline" className="text-xs">
                              {common.pre_test_probability}
                            </Badge>
                          </div>
                          {common.classic && (
                            <p className="text-xs text-gray-300">
                              <span className="font-semibold">Classic:</span> {common.classic}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Working Diagnosis */}
          {parsedData.working_diagnosis && (
            <div className="space-y-3">
              <h4 className="font-semibold text-green-400 text-base">Working Diagnosis</h4>
              <div className="bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-sm text-gray-300 break-words mb-2">
                  <span className="font-semibold text-green-300">{parsedData.working_diagnosis.primary}</span>
                  {parsedData.working_diagnosis.probability && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {parsedData.working_diagnosis.probability}
                    </Badge>
                  )}
                </p>
                {parsedData.working_diagnosis.active_problems && (
                  <p className="text-xs text-gray-400">
                    <span className="font-semibold">Active Problems:</span>{" "}
                    {parsedData.working_diagnosis.active_problems.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Treatment Plans */}
          {parsedData.treatment_by_problem && parsedData.treatment_by_problem.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-400 text-base flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Treatment Plan
              </h4>
              <div className="space-y-3">
                {parsedData.treatment_by_problem.map((treatment: TreatmentByProblem, index: number) => (
                  <div key={index} className="bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-blue-300 break-words mb-3">{treatment.problem}</p>

                    {/* Definitive Treatment */}
                    {treatment.definitive_treatment && (
                      <div className="mb-3 p-3 bg-blue-800/20 rounded">
                        <p className="text-xs font-semibold text-blue-200 mb-2">Definitive Treatment</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                          {treatment.definitive_treatment.medication &&
                            treatment.definitive_treatment.medication !== "N/A" && (
                              <p>
                                <span className="font-semibold">Medication:</span>{" "}
                                {treatment.definitive_treatment.medication}
                              </p>
                            )}
                          {treatment.definitive_treatment.dose && treatment.definitive_treatment.dose !== "N/A" && (
                            <p>
                              <span className="font-semibold">Dose:</span> {treatment.definitive_treatment.dose}
                            </p>
                          )}
                          {treatment.definitive_treatment.route && treatment.definitive_treatment.route !== "N/A" && (
                            <p>
                              <span className="font-semibold">Route:</span> {treatment.definitive_treatment.route}
                            </p>
                          )}
                          {treatment.definitive_treatment.duration &&
                            treatment.definitive_treatment.duration !== "N/A" && (
                              <p>
                                <span className="font-semibold">Duration:</span>{" "}
                                {treatment.definitive_treatment.duration}
                              </p>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Interventions */}
                    {treatment.interventions && (
                      <div className="mb-3 p-3 bg-blue-800/20 rounded">
                        <p className="text-xs font-semibold text-blue-200 mb-2">Interventions</p>
                        <div className="space-y-1">
                          {Object.entries(treatment.interventions).map(([key, value]) => (
                            <p key={key} className="text-xs text-gray-300">
                              <span className="font-semibold capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                              {String(value)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Symptom Control */}
                    {treatment.symptom_control && (
                      <div className="p-3 bg-blue-800/20 rounded">
                        <p className="text-xs font-semibold text-blue-200 mb-2">Symptom Control</p>
                        <div className="space-y-1 text-xs text-gray-300">
                          <p>
                            <span className="font-semibold">Medication:</span> {treatment.symptom_control.medication}
                          </p>
                          <p>
                            <span className="font-semibold">Dose:</span> {treatment.symptom_control.dose}
                          </p>
                          {treatment.symptom_control.max_daily && (
                            <p>
                              <span className="font-semibold">Max Daily:</span> {treatment.symptom_control.max_daily}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disposition */}
          {parsedData.disposition && (
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-400 text-base">Disposition</h4>
              <div className="bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                {parsedData.disposition.admit_if && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-purple-300 mb-2">Admit if:</p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {parsedData.disposition.admit_if.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsedData.disposition.discharge_if_all && (
                  <div>
                    <p className="text-sm font-semibold text-purple-300 mb-2">Discharge if all:</p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {parsedData.disposition.discharge_if_all.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discharge Instructions */}
          {parsedData.discharge_instructions && (
            <div className="space-y-3">
              <h4 className="font-semibold text-indigo-400 text-base">Discharge Instructions</h4>
              <div className="bg-indigo-900/20 p-4 rounded-lg border-l-4 border-indigo-500">
                {parsedData.discharge_instructions.return_immediately && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-red-300 mb-2">Return Immediately If:</p>
                    <div className="space-y-2">
                      {parsedData.discharge_instructions.return_immediately.map((item: DischargeInstructionItem, index: number) => (
                        <div key={index} className="bg-red-900/20 p-2 rounded text-sm">
                          {item.symptom && (
                            <p className="text-gray-300">
                              <span className="font-semibold text-red-300">Symptom:</span> {item.symptom}
                            </p>
                          )}
                          {item.concern && (
                            <p className="text-gray-400 text-xs">
                              <span className="font-semibold">Concern:</span> {item.concern}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.discharge_instructions.follow_up && (
                  <div>
                    <p className="text-sm font-semibold text-indigo-300 mb-2">Follow-up:</p>
                    <div className="space-y-1">
                      {parsedData.discharge_instructions.follow_up.map((item: DischargeInstructionItem, index: number) => (
                        <p key={index} className="text-sm text-gray-300">
                          • <span className="font-semibold">{item.provider || item.test}:</span>{" "}
                          {item.timeframe || item.condition}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoadingHistory) {
    return (
      <div className="flex h-screen bg-[#212121] text-white items-center justify-center">
        <div className="text-center">
          <Stethoscope className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading from localStorage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#212121] text-white relative">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 z-40 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:relative z-50 lg:z-auto w-80 lg:w-80 bg-[#171717] border-r-2 border-gray-600 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none`}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-gray-600 bg-[#1a1a1a]">
          <Button
            onClick={startNewSession}
            className="w-full bg-transparent border border-gray-600 hover:bg-gray-700 rounded-lg py-2 px-3 text-left flex items-center gap-2 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>

        {/* Sessions */}
        <ScrollArea className="flex-1 p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-all duration-200 mb-1 relative ${
                session.active ? "bg-gray-700" : ""
              }`}
              onClick={() => switchToSession(session.id)}
            >
              <div className="text-sm truncate font-medium pr-10">{session.title}</div>
              <div className="text-xs text-gray-400 truncate pr-10 mt-1">
                {session.lastMessage || `${session.messageCount || 0} messages`}
              </div>

              {/* Delete button - Always visible on mobile, hover on desktop */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200 rounded-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 bg-gray-800 border-gray-600">
                    <DropdownMenuItem
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer focus:bg-red-900/20 focus:text-red-300 flex items-center gap-2"
                      onClick={(e) => openDeleteDialog(session, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-8 px-4">
              No sessions yet. Start a new chat to begin!
            </div>
          )}
        </ScrollArea>

        {/* User Section */}
        <div className="p-4 border-t-2 border-gray-600 bg-[#1a1a1a]">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700 transition-all duration-200">
            <UserButton />
            <span className="text-sm">Account</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-600 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Delete Chat Session
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              {sessionToDelete && (
                <div className="space-y-2">
                  <p>Are you sure you want to delete this chat session?</p>
                  <div className="bg-gray-700 p-3 rounded-lg border-l-4 border-blue-500">
                    <p className="font-medium text-sm text-blue-300">{sessionToDelete.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {sessionToDelete.messageCount} messages • {new Date(sessionToDelete.timestamp).toLocaleDateString()}
                    </p>
                    {sessionToDelete.lastMessage && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        "{sessionToDelete.lastMessage}"
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-red-300 font-medium">
                    This action cannot be undone. All messages in this session will be permanently deleted.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSession}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-3 lg:p-4 border-b border-gray-700 bg-[#212121]/80 backdrop-blur-sm">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-full w-8 h-8 hover:bg-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
            <span className="text-lg lg:text-xl font-semibold">ECDS v5.0</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xs lg:text-sm text-gray-400 hidden sm:block">
            Active Session: {currentSessionId.substring(0, 8)}... ({messages.length} messages)
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-2 lg:p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                <div className="text-center mb-6 lg:mb-8">
                  <Stethoscope className="w-12 h-12 lg:w-16 lg:h-16 text-blue-400 mx-auto mb-4" />
                  <h1 className="text-2xl lg:text-4xl font-normal mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Emergency Clinical Decision Support
                  </h1>
                  <p className="text-gray-400 text-base lg:text-lg">
                    Get comprehensive medical assessments for any clinical presentation
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 max-w-2xl w-full">
                  {[
                    { title: "Chest Pain", desc: "45-year-old male with chest pain" },
                    { title: "Abdominal Pain", desc: "25-year-old with abdominal pain" },
                    { title: "Shortness of Breath", desc: "60-year-old with shortness of breath" },
                    { title: "Headache", desc: "30-year-old female with severe headache" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="p-3 lg:p-4 border border-gray-600 rounded-xl hover:bg-gray-700/50 cursor-pointer transition-all duration-200 hover:border-gray-500 group"
                      onClick={() => setInput(item.desc)}
                    >
                      <div className="font-medium mb-2 group-hover:text-blue-400 transition-colors text-sm lg:text-base">{item.title}</div>
                      <div className="text-gray-400 text-xs lg:text-sm">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-4 lg:space-y-6 min-h-full">
                {messages.map((message) => (
                  <div key={message.id} className="group">
                    <div className={`flex gap-2 lg:gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
                      {message.role === "assistant" && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                          </div>
                        </div>
                      )}

                      <div
                        className={`w-full ${
                          message.role === "user" 
                            ? "bg-blue-600 text-white rounded-2xl px-3 py-2 lg:px-4 lg:py-3 max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] ml-auto" 
                            : "max-w-full"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          renderAssistantMessage(message)
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed break-words text-white text-sm lg:text-base">
                            {message.content}
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 lg:gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="p-3 lg:p-4 border-t border-gray-700 bg-[#212121]/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe patient presentation..."
                className="w-full bg-[#2f2f2f] border-gray-600 rounded-3xl py-3 lg:py-4 xl:py-6 px-4 lg:px-6 pr-12 lg:pr-16 text-white placeholder-gray-400 text-sm lg:text-base xl:text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                disabled={isLoading}
                maxLength={2000}
              />

              <div className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-3 h-3 lg:w-4 lg:h-4" />
                </Button>
              </div>
            </form>

            <div className="text-center text-gray-400 text-xs lg:text-sm mt-3 lg:mt-4">
              Emergency Clinical Decision Support • Character limit: {input.length}/2000
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
