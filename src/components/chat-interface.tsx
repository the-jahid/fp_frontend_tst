"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserButton } from "@clerk/nextjs"
import { Send, Plus, ChevronDown, User, Menu, AlertTriangle, Activity, Stethoscope, Pill, Trash2, MoreHorizontal } from "lucide-react"
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

// -------------------- Chat types --------------------
interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  sessionId: string
}
interface Session {
  id: string
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

// -------------------- Medical JSON types --------------------
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
  confirm?: string
  consider_if?: string
  test?: string
  post_test_probability?: string
}
interface DifferentialDiagnosis {
  tier_1_life_threats?: DiagnosisItem[]
  tier_2_urgent?: DiagnosisItem[]
  tier_3_common?: DiagnosisItem[]
  tier_4_rare?: DiagnosisItem[]
  checklist?: string[]
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
  taper?: string
  monitor?: string
}
interface TreatmentByProblem {
  problem: string
  definitive_treatment?: DefinitiveTreatment
  interventions?: TreatmentInterventions | string[]
  symptom_control?: SymptomControl
  evidence?: { nnt?: string; reference?: string }
  duration_limit?: string
  monitoring?: string[] // for dehydration block
  goal?: string // for fall prevention block
}
interface UrgentProtocol {
  tasks?: string[]
}
interface DiagnosticRow {
  test: string
  sensitivity?: string
  specificity?: string
  use_when?: string
}
interface HintsExam {
  head_impulse?: string
  nystagmus?: string
  test_of_skew?: string
  interpretation?: string
}
interface PrimaryDiagnosisDetails {
  pathophysiology?: string
  diagnostic_criteria?: string
  natural_history?: string
}
interface VestibularExercise {
  type: string
  technique: string
  frequency: string
}
interface VestibularRehab {
  start_time?: string
  exercises?: VestibularExercise[]
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
interface DischargeMedication {
  name: string
  dose?: string
  duration?: string
  instructions?: string
  max?: string
}
interface DischargeInstructions {
  return_immediately?: DischargeInstructionItem[]
  follow_up?: DischargeInstructionItem[]
  medications?: DischargeMedication[]
}
interface EvidenceBaseItem {
  topic: string
  citation: string
}
interface ReassessItem {
  trigger: string
  action: string
}
interface MedicalAssessmentData {
  immediate_assessment?: ImmediateAssessment
  critical_actions?: CriticalAction[]
  urgent_protocol?: UrgentProtocol
  diagnostics?: DiagnosticRow[]
  hints_exam?: HintsExam
  differential_diagnosis?: DifferentialDiagnosis
  working_diagnosis?: WorkingDiagnosis
  primary_diagnosis_details?: PrimaryDiagnosisDetails
  treatment_by_problem?: TreatmentByProblem[]
  vestibular_rehab?: VestibularRehab
  disposition?: Disposition
  discharge_instructions?: DischargeInstructions
  evidence_base?: EvidenceBaseItem[]
  reassess_if?: ReassessItem[]
  internal_qa?: string
}

// -------------------- Small UI helpers --------------------
const Section = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-3">{children}</div>
)

const SectionHead = ({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) => (
  <h4 className={`font-semibold ${color} text-base flex items-center gap-2`}>{icon}{title}</h4>
)

const TableWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border border-gray-700">
    <table className="min-w-full text-sm">
      {children}
    </table>
  </div>
)

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`bg-gray-900 text-gray-300 px-3 py-2 text-left font-semibold ${className}`}>{children}</th>
)

const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 border-t border-gray-700 align-top text-gray-200 ${className}`}>{children}</td>
)

// ----------------------------------------------------------

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
  useEffect(() => { scrollToBottom() }, [messages])

  const generateSessionId = () => {
    const chars = "0123456789abcdef"
    const sections = [8, 4, 4, 4, 12]
    return sections.map(len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")).join("-")
  }

  const loadStoredSessionData = useCallback((): StoredSessionData | null => {
    try {
      const storedData = localStorage.getItem("chatSessionData")
      if (storedData) {
        const parsed = JSON.parse(storedData) as StoredSessionData
        if (parsed.messagesBySession) {
          Object.keys(parsed.messagesBySession).forEach((sessionId) => {
            parsed.messagesBySession[sessionId] = parsed.messagesBySession[sessionId].map((msg: Message) => ({
              ...msg, timestamp: new Date(msg.timestamp),
            }))
          })
        }
        return parsed
      }
    } catch (_) {}
    return null
  }, [])

  const saveSessionData = useCallback((sessionData: Partial<StoredSessionData>) => {
    try {
      const currentData = loadStoredSessionData() || { sessions: [], messagesBySession: {}, currentSessionId: "" }
      const updatedData = { ...currentData, ...sessionData }
      localStorage.setItem("chatSessionData", JSON.stringify(updatedData))
    } catch (_) {}
  }, [loadStoredSessionData])

  const createNewSession = useCallback(() => {
    const newSessionId = generateSessionId()
    const newSession: Session = { id: newSessionId, title: "New conversation", active: true, timestamp: new Date().toISOString(), messageCount: 0 }
    setSessions(prev => [newSession, ...prev.map(s => ({ ...s, active: false }))])
    setMessagesBySession(prev => ({ ...prev, [newSessionId]: [] }))
    setCurrentSessionId(newSessionId)
    setMessages([])
    setTimeout(() => {
      const currentData = loadStoredSessionData() || { sessions: [], messagesBySession: {}, currentSessionId: "" }
      saveSessionData({
        sessions: [newSession, ...currentData.sessions.map(s => ({ ...s, active: false }))],
        messagesBySession: { ...currentData.messagesBySession, [newSessionId]: [] },
        currentSessionId: newSessionId,
      })
    }, 0)
    return newSessionId
  }, [saveSessionData, loadStoredSessionData])

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoadingHistory(true)
        const stored = loadStoredSessionData()
        if (stored && stored.currentSessionId && stored.sessions.length > 0) {
          const sessionMessages = stored.messagesBySession[stored.currentSessionId] || []
          setCurrentSessionId(stored.currentSessionId)
          setSessions(stored.sessions.map(s => ({ ...s, active: s.id === stored.currentSessionId })))
          setMessages(sessionMessages)
          setMessagesBySession(stored.messagesBySession)
        } else {
          createNewSession()
        }
      } catch (_) {
        createNewSession()
      } finally {
        setIsLoadingHistory(false)
      }
    }
    init()
  }, [loadStoredSessionData, createNewSession])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !currentSessionId) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
      sessionId: currentSessionId,
    }

    const currentInput = input.trim()
    setInput("")
    const currentMessages = messagesBySession[currentSessionId] || []
    const updatedMessagesWithUser = [...currentMessages, userMessage]
    setMessages(updatedMessagesWithUser)
    const updatedMessagesBySession = { ...messagesBySession, [currentSessionId]: updatedMessagesWithUser }
    setMessagesBySession(updatedMessagesBySession)
    setIsLoading(true)

    try {
      const payload = { question: currentInput, overrideConfig: { sessionId: currentSessionId } }
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to get response")

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        content: data.message,
        role: "assistant",
        timestamp: new Date(),
        sessionId: currentSessionId,
      }

      const finalMessages = [...updatedMessagesWithUser, assistantMessage]
      setMessages(finalMessages)
      const finalMessagesBySession = { ...messagesBySession, [currentSessionId]: finalMessages }
      setMessagesBySession(finalMessagesBySession)

      const updatedSessions = sessions.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              messageCount: finalMessages.length,
              lastMessage: currentInput.slice(0, 50) + (currentInput.length > 50 ? "..." : ""),
              timestamp: new Date().toISOString(),
              title: sessions.find(ss => ss.id === currentSessionId)?.title === "New conversation"
                ? currentInput.slice(0, 30) + (currentInput.length > 30 ? "..." : "")
                : sessions.find(ss => ss.id === currentSessionId)?.title || "New conversation",
            }
          : s
      )
      setSessions(updatedSessions)
      saveSessionData({ sessions: updatedSessions, messagesBySession: finalMessagesBySession, currentSessionId })
    } catch (_) {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: "I'm sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
        sessionId: currentSessionId,
      }
      const messagesWithError = [...updatedMessagesWithUser, errorMessage]
      setMessages(messagesWithError)
      const errorMessagesBySession = { ...messagesBySession, [currentSessionId]: messagesWithError }
      setMessagesBySession(errorMessagesBySession)
      saveSessionData({ messagesBySession: errorMessagesBySession })
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const startNewSession = () => { createNewSession() }

  const switchToSession = (sessionId: string) => {
    if (sessionId === currentSessionId) return
    try {
      const sessionMessages = messagesBySession[sessionId] || []
      const updatedSessions = sessions.map(s => ({ ...s, active: s.id === sessionId }))
      setCurrentSessionId(sessionId)
      setSessions(updatedSessions)
      setMessages(sessionMessages)
      saveSessionData({ sessions: updatedSessions, currentSessionId: sessionId })
      setSidebarOpen(false)
    } catch (_) {}
  }

  const openDeleteDialog = (session: Session, e: React.MouseEvent) => { e.stopPropagation(); setSessionToDelete(session); setDeleteDialogOpen(true) }
  const closeDeleteDialog = () => { setDeleteDialogOpen(false); setSessionToDelete(null); setIsDeleting(false) }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return
    setIsDeleting(true)
    try {
      const updatedSessions = sessions.filter(s => s.id !== sessionToDelete.id)
      const updatedMessagesBySession = { ...messagesBySession }
      delete updatedMessagesBySession[sessionToDelete.id]
      setSessions(updatedSessions)
      setMessagesBySession(updatedMessagesBySession)

      if (sessionToDelete.id === currentSessionId) {
        if (updatedSessions.length > 0) {
          const first = updatedSessions[0]
          setCurrentSessionId(first.id)
          setMessages(updatedMessagesBySession[first.id] || [])
          const finalSessions = updatedSessions.map((s, i) => ({ ...s, active: i === 0 }))
          setSessions(finalSessions)
          localStorage.setItem("chatSessionData", JSON.stringify({
            sessions: finalSessions,
            messagesBySession: updatedMessagesBySession,
            currentSessionId: first.id,
          }))
        } else {
          localStorage.removeItem("chatSessionData")
          createNewSession()
        }
      } else {
        localStorage.setItem("chatSessionData", JSON.stringify({
          sessions: updatedSessions,
          messagesBySession: updatedMessagesBySession,
          currentSessionId,
        }))
      }
      setTimeout(() => closeDeleteDialog(), 400)
    } catch (_) { setIsDeleting(false) }
  }

  // -------------------- JSON renderer --------------------
  const renderKeyValueMini = (obj: Record<string, string | undefined>) => (
    <TableWrap>
      <thead>
        <tr>
          <Th>Parameter</Th>
          <Th>Value</Th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(obj).filter(([, v]) => v).map(([k, v]) => (
          <tr key={k}>
            <Td className="capitalize">{k.replace(/_/g, " ")}</Td>
            <Td>{v as string}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )

  const renderInterventions = (interventions?: TreatmentInterventions | string[]) => {
    if (!interventions) return null
    if (Array.isArray(interventions)) {
      return (
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-300">
          {interventions.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )
    }
    return (
      <TableWrap>
        <thead>
          <tr>
            <Th>Step</Th>
            <Th>Plan</Th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(interventions).map(([k, v]) => (
            <tr key={k}>
              <Td className="capitalize">{k.replace(/_/g, " ")}</Td>
              <Td>{String(v)}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    )
  }

  const renderDifferentialTier = (label: string, rows?: DiagnosisItem[], color: string = "text-gray-200") => {
    if (!rows || rows.length === 0) return null
    return (
      <div className="space-y-2">
        <h5 className={`text-sm font-semibold ${color}`}>{label}</h5>
        <TableWrap>
          <thead>
            <tr>
              <Th>Dx</Th>
              <Th className="w-24">Pre %</Th>
              <Th>Key Feature</Th>
              <Th>Rule-Out / Confirm</Th>
              <Th className="w-28">Post %</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <Td className="font-medium">{r.diagnosis}</Td>
                <Td>{r.pre_test_probability}</Td>
                <Td>{r.discriminator || r.features || r.classic || r.consider_if || "-"}</Td>
                <Td>{r.rule_out || r.confirm || r.test || "-"}</Td>
                <Td>{r.post_test_probability || "-"}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>
    )
  }

  const renderAssistantMessage = (message: Message) => {
    // Parse JSON safely (strip code fences if present)
    let parsedData: MedicalAssessmentData | null = null
    try {
      let clean = message.content.trim()
      if (clean.startsWith("```json")) clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "")
      else if (clean.startsWith("```")) clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "")
      parsedData = JSON.parse(clean) as MedicalAssessmentData
    } catch (_) {}

    if (!parsedData) {
      return (
        <Card className="bg-gray-800 border-gray-600 w-full max-w-full overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">ECDS v5.0 - Emergency Clinical Decision Support</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Clinical Assessment" color="text-blue-400" />
              <div className="bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
              </div>
            </Section>
          </CardContent>
        </Card>
      )
    }

    // Tabular/sectioned render
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
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Immediate Assessment" color="text-green-400" />
              <div className="bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <p className="text-sm text-gray-300 mb-3 font-medium">{parsedData.immediate_assessment.patient}</p>
                {parsedData.immediate_assessment.complete_diagnosis && (
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-green-800/20 p-3 rounded">
                      <p className="text-green-300 font-semibold">Primary</p>
                      <p className="text-gray-200">{parsedData.immediate_assessment.complete_diagnosis.primary}</p>
                    </div>
                    {parsedData.immediate_assessment.complete_diagnosis.secondary && (
                      <div className="bg-green-800/20 p-3 rounded">
                        <p className="text-green-300 font-semibold">Secondary</p>
                        <p className="text-gray-200">{parsedData.immediate_assessment.complete_diagnosis.secondary.join(", ")}</p>
                      </div>
                    )}
                    {parsedData.immediate_assessment.complete_diagnosis.complications && (
                      <div className="bg-green-800/20 p-3 rounded">
                        <p className="text-green-300 font-semibold">Complications</p>
                        <p className="text-gray-200">{parsedData.immediate_assessment.complete_diagnosis.complications.join(", ")}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Critical Actions */}
          {parsedData.critical_actions && parsedData.critical_actions.length > 0 && (
            <Section>
              <SectionHead icon={<AlertTriangle className="w-4 h-4" />} title="Critical Actions" color="text-red-400" />
              <TableWrap>
                <thead>
                  <tr>
                    <Th className="w-24">Priority</Th>
                    <Th>Condition</Th>
                    <Th>Action</Th>
                    <Th>Red Flag</Th>
                    <Th>Evidence</Th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.critical_actions.map((a, i) => (
                    <tr key={i}>
                      <Td><Badge variant="destructive" className="text-xs">P{a.priority}</Badge></Td>
                      <Td>{a.condition}</Td>
                      <Td>{a.action}</Td>
                      <Td>{a.red_flag || "-"}</Td>
                      <Td className="text-gray-400">{a.evidence || "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Section>
          )}

          {/* Urgent Protocol & Diagnostics */}
          {(parsedData.urgent_protocol?.tasks?.length || parsedData.diagnostics?.length) && (
            <div className="grid lg:grid-cols-2 gap-4">
              {parsedData.urgent_protocol?.tasks?.length ? (
                <Section>
                  <SectionHead icon={<Activity className="w-4 h-4" />} title="Urgent Protocol" color="text-yellow-400" />
                  <div className="bg-yellow-900/20 p-4 rounded-lg border-l-4 border-yellow-500">
                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-200">
                      {parsedData.urgent_protocol.tasks!.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                </Section>
              ) : null}

              {parsedData.diagnostics?.length ? (
                <Section>
                  <SectionHead icon={<Stethoscope className="w-4 h-4" />} title="Diagnostics" color="text-blue-400" />
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>Test</Th>
                        <Th className="w-24">Sens</Th>
                        <Th className="w-24">Spec</Th>
                        <Th>Use when</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.diagnostics.map((d, i) => (
                        <tr key={i}>
                          <Td className="font-medium">{d.test}</Td>
                          <Td>{d.sensitivity || "-"}</Td>
                          <Td>{d.specificity || "-"}</Td>
                          <Td>{d.use_when || "-"}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </Section>
              ) : null}
            </div>
          )}

          {/* HINTS exam */}
          {parsedData.hints_exam && Object.keys(parsedData.hints_exam).length > 0 && (
            <Section>
              <SectionHead icon={<Stethoscope className="w-4 h-4" />} title="HINTS Exam" color="text-indigo-400" />
              {renderKeyValueMini({
                head_impulse: parsedData.hints_exam.head_impulse,
                nystagmus: parsedData.hints_exam.nystagmus,
                test_of_skew: parsedData.hints_exam.test_of_skew,
                interpretation: parsedData.hints_exam.interpretation,
              })}
            </Section>
          )}

          {/* Differential Diagnosis (multi-tables like screenshot) */}
          {parsedData.differential_diagnosis && (
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Differential Diagnosis" color="text-yellow-400" />
              <div className="space-y-4">
                {renderDifferentialTier("Tier 1 — Life Threats", parsedData.differential_diagnosis.tier_1_life_threats, "text-red-300")}
                {renderDifferentialTier("Tier 2 — Urgent", parsedData.differential_diagnosis.tier_2_urgent, "text-orange-300")}
                {renderDifferentialTier("Tier 3 — Common", parsedData.differential_diagnosis.tier_3_common, "text-yellow-300")}
                {renderDifferentialTier("Level 4 — Rare but Serious", parsedData.differential_diagnosis.tier_4_rare, "text-pink-300")}
                {parsedData.differential_diagnosis.checklist?.length ? (
                  <div className="bg-gray-900/40 p-3 rounded border border-gray-700">
                    <p className="text-xs font-semibold text-gray-300 mb-2">Checklist</p>
                    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                      {parsedData.differential_diagnosis.checklist.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Section>
          )}

          {/* Working Diagnosis + Details */}
          {(parsedData.working_diagnosis || parsedData.primary_diagnosis_details) && (
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Working Diagnosis" color="text-green-400" />
              {parsedData.working_diagnosis && (
                <div className="bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500 mb-3">
                  <p className="text-sm text-gray-200 mb-1">
                    <span className="font-semibold text-green-300">{parsedData.working_diagnosis.primary}</span>
                    {parsedData.working_diagnosis.probability && (
                      <Badge variant="outline" className="ml-2 text-xs">{parsedData.working_diagnosis.probability}</Badge>
                    )}
                  </p>
                  {parsedData.working_diagnosis.active_problems?.length ? (
                    <p className="text-xs text-gray-400"><span className="font-semibold">Active Problems:</span> {parsedData.working_diagnosis.active_problems.join(", ")}</p>
                  ) : null}
                </div>
              )}
              {parsedData.primary_diagnosis_details && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {parsedData.primary_diagnosis_details.pathophysiology && (
                    <div className="bg-gray-900/40 p-3 rounded border border-gray-700">
                      <p className="text-xs font-semibold text-gray-300 mb-1">Pathophysiology</p>
                      <p className="text-sm text-gray-200">{parsedData.primary_diagnosis_details.pathophysiology}</p>
                    </div>
                  )}
                  {parsedData.primary_diagnosis_details.diagnostic_criteria && (
                    <div className="bg-gray-900/40 p-3 rounded border border-gray-700">
                      <p className="text-xs font-semibold text-gray-300 mb-1">Diagnostic Criteria</p>
                      <p className="text-sm text-gray-200">{parsedData.primary_diagnosis_details.diagnostic_criteria}</p>
                    </div>
                  )}
                  {parsedData.primary_diagnosis_details.natural_history && (
                    <div className="bg-gray-900/40 p-3 rounded border border-gray-700">
                      <p className="text-xs font-semibold text-gray-300 mb-1">Natural History</p>
                      <p className="text-sm text-gray-200">{parsedData.primary_diagnosis_details.natural_history}</p>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* Treatment Plan (cards with nested tables/lists) */}
          {parsedData.treatment_by_problem && parsedData.treatment_by_problem.length > 0 && (
            <Section>
              <SectionHead icon={<Pill className="w-4 h-4" />} title="Treatment Plan" color="text-blue-400" />
              <div className="space-y-3">
                {parsedData.treatment_by_problem.map((t, i) => (
                  <div key={i} className="bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm font-semibold text-blue-300 mb-3">{t.problem}</p>

                    {t.definitive_treatment && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-blue-200 mb-2">Definitive Treatment</p>
                        {renderKeyValueMini({
                          medication: t.definitive_treatment.medication,
                          dose: t.definitive_treatment.dose,
                          route: t.definitive_treatment.route,
                          duration: t.definitive_treatment.duration,
                          taper: t.definitive_treatment.taper,
                          monitor: t.definitive_treatment.monitor,
                        })}
                      </div>
                    )}

                    {t.interventions && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-blue-200 mb-2">Interventions</p>
                        {renderInterventions(t.interventions)}
                      </div>
                    )}

                    {t.symptom_control && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-blue-200 mb-2">Symptom Control</p>
                        {renderKeyValueMini({
                          medication: t.symptom_control.medication,
                          dose: t.symptom_control.dose,
                          max_daily: t.symptom_control.max_daily,
                        })}
                      </div>
                    )}

                    {t.monitoring?.length ? (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-blue-200 mb-1">Monitoring</p>
                        <ul className="list-disc pl-5 text-xs text-gray-300 space-y-1">
                          {t.monitoring.map((m, idx) => <li key={idx}>{m}</li>)}
                        </ul>
                      </div>
                    ) : null}

                    {t.goal && <p className="text-xs text-gray-300"><span className="font-semibold">Goal:</span> {t.goal}</p>}
                    {t.duration_limit && <p className="text-xs text-gray-300"><span className="font-semibold">Duration limit:</span> {t.duration_limit}</p>}
                    {t.evidence && (t.evidence.nnt || t.evidence.reference) && (
                      <p className="text-[11px] text-gray-400 mt-2">Evidence: {t.evidence.nnt ? `NNT ${t.evidence.nnt}` : ""} {t.evidence.reference ? `• ${t.evidence.reference}` : ""}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Vestibular Rehab */}
          {parsedData.vestibular_rehab && (parsedData.vestibular_rehab.start_time || parsedData.vestibular_rehab.exercises?.length) && (
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Vestibular Rehabilitation" color="text-teal-300" />
              {parsedData.vestibular_rehab.start_time && (
                <p className="text-sm text-gray-200 mb-2"><span className="font-semibold">Start:</span> {parsedData.vestibular_rehab.start_time}</p>
              )}
              {parsedData.vestibular_rehab.exercises?.length ? (
                <TableWrap>
                  <thead>
                    <tr>
                      <Th>Type</Th>
                      <Th>Technique</Th>
                      <Th>Frequency</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.vestibular_rehab.exercises.map((ex, i) => (
                      <tr key={i}>
                        <Td className="font-medium">{ex.type}</Td>
                        <Td>{ex.technique}</Td>
                        <Td>{ex.frequency}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              ) : null}
            </Section>
          )}

          {/* Disposition */}
          {parsedData.disposition && (
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Disposition" color="text-purple-400" />
              <div className="bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                {parsedData.disposition.admit_if?.length ? (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-purple-300 mb-2">Admit if:</p>
                    <ul className="text-sm text-gray-200 space-y-1 list-disc pl-5">
                      {parsedData.disposition.admit_if.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                ) : null}
                {parsedData.disposition.discharge_if_all?.length ? (
                  <div>
                    <p className="text-sm font-semibold text-purple-300 mb-2">Discharge if all:</p>
                    <ul className="text-sm text-gray-200 space-y-1 list-disc pl-5">
                      {parsedData.disposition.discharge_if_all.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Section>
          )}

          {/* Discharge Instructions (Return, Meds, Follow-up) */}
          {parsedData.discharge_instructions && (
            <Section>
              <SectionHead icon={<Activity className="w-4 h-4" />} title="Discharge Instructions" color="text-indigo-400" />
              <div className="space-y-4">
                {parsedData.discharge_instructions.return_immediately?.length ? (
                  <div>
                    <p className="text-sm font-semibold text-red-300 mb-2">Return Immediately If</p>
                    <TableWrap>
                      <thead>
                        <tr>
                          <Th>Symptom</Th>
                          <Th>Concern</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.discharge_instructions.return_immediately.map((it, i) => (
                          <tr key={i}>
                            <Td>{it.symptom}</Td>
                            <Td>{it.concern}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </div>
                ) : null}

                {parsedData.discharge_instructions.medications?.length ? (
                  <div>
                    <p className="text-sm font-semibold text-indigo-300 mb-2">Medications</p>
                    <TableWrap>
                      <thead>
                        <tr>
                          <Th>Medication</Th>
                          <Th>Dose</Th>
                          <Th>Duration</Th>
                          <Th>Max</Th>
                          <Th>Instructions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.discharge_instructions.medications.map((m, i) => (
                          <tr key={i}>
                            <Td className="font-medium">{m.name}</Td>
                            <Td>{m.dose || "-"}</Td>
                            <Td>{m.duration || "-"}</Td>
                            <Td>{m.max || "-"}</Td>
                            <Td>{m.instructions || "-"}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </div>
                ) : null}

                {parsedData.discharge_instructions.follow_up?.length ? (
                  <div>
                    <p className="text-sm font-semibold text-indigo-300 mb-2">Follow-Up</p>
                    <TableWrap>
                      <thead>
                        <tr>
                          <Th>Provider / Test</Th>
                          <Th>When / Condition</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.discharge_instructions.follow_up.map((f, i) => (
                          <tr key={i}>
                            <Td>{f.provider || f.test}</Td>
                            <Td>{f.timeframe || f.condition}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </div>
                ) : null}
              </div>
            </Section>
          )}

          {/* Evidence & Reassess */}
          {(parsedData.evidence_base?.length || parsedData.reassess_if?.length) && (
            <div className="grid md:grid-cols-2 gap-4">
              {parsedData.evidence_base?.length ? (
                <Section>
                  <SectionHead icon={<Activity className="w-4 h-4" />} title="Evidence Base" color="text-gray-300" />
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>Topic</Th>
                        <Th>Citation</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.evidence_base.map((e, i) => (
                        <tr key={i}>
                          <Td className="font-medium">{e.topic}</Td>
                          <Td>{e.citation}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </Section>
              ) : null}

              {parsedData.reassess_if?.length ? (
                <Section>
                  <SectionHead icon={<Activity className="w-4 h-4" />} title="Reassess If" color="text-gray-300" />
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>Trigger</Th>
                        <Th>Action</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.reassess_if.map((r, i) => (
                        <tr key={i}>
                          <Td>{r.trigger}</Td>
                          <Td>{r.action}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </Section>
              ) : null}
            </div>
          )}

          {/* Internal QA */}
          {parsedData.internal_qa && (
            <p className="text-[11px] text-gray-400 italic">QA: {parsedData.internal_qa}</p>
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
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:relative z-50 lg:z-auto w-80 lg:w-80 bg-[#171717] border-r-2 border-gray-600 flex flex-col h-full transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none`}>
        <div className="p-4 border-b-2 border-gray-600 bg-[#1a1a1a]">
          <Button onClick={startNewSession} className="w-full bg-transparent border border-gray-600 hover:bg-gray-700 rounded-lg py-2 px-3 text-left flex items-center gap-2 transition-all duration-200">
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1 p-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-all duration-200 mb-1 relative ${session.active ? "bg-gray-700" : ""}`}
              onClick={() => switchToSession(session.id)}
            >
              <div className="text-sm truncate font-medium pr-10">{session.title}</div>
              <div className="text-xs text-gray-400 truncate pr-10 mt-1">
                {session.lastMessage || `${session.messageCount || 0} messages`}
              </div>

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
            <div className="text-center text-gray-500 text-sm mt-8 px-4">No sessions yet. Start a new chat to begin!</div>
          )}
        </ScrollArea>

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
                        &quot;{sessionToDelete.lastMessage}&quot;
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
            <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white border-0">
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
        <header className="flex justify-between items-center p-3 lg:p-4 border-b border-gray-700 bg-[#212121]/80 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="lg:hidden rounded-full w-8 h-8 hover:bg-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 lg:w-6 lg:h-6 text-blue-400" />
            <span className="text-lg lg:text-xl font-semibold">ECDS v5.0</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xs lg:text-sm text-gray-400 hidden sm:block">
            Active Session: {currentSessionId.substring(0, 8)}… ({messages.length} messages)
          </div>
        </header>

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

                      <div className={`w-full ${message.role === "user" ? "bg-blue-600 text-white rounded-2xl px-3 py-2 lg:px-4 lg:py-3 max-w-[90%] sm:max-w-[85%] lg:max-w-[80%] ml-auto" : "max-w-full"}`}>
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

        {/* Input */}
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
                <Button type="submit" size="icon" className="rounded-full w-6 h-6 lg:w-8 lg:h-8 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 disabled:opacity-50" disabled={!input.trim() || isLoading}>
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
