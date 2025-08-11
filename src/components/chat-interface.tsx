"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Stethoscope } from "lucide-react"

// ===================== Types (aligned to your schema) =====================
interface CriticalAction {
  priority: number
  condition: string
  action: string
  red_flag?: string
  evidence?: string
}


type PrimitivePrintable = string | number | boolean
type KV = Record<string, PrimitivePrintable | null | undefined>

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

interface DefinitiveTreatment {
  medication?: string
  dose?: string
  route?: string
  duration?: string
  taper?: string
  monitor?: string
}

type TreatmentInterventions = Record<string, string | boolean | number>

interface SymptomControl {
  medication: string
  dose: string
  max_daily?: string
}

interface TreatmentByProblem {
  problem: string
  definitive_treatment?: DefinitiveTreatment
  interventions?: TreatmentInterventions
  symptom_control?: SymptomControl
  evidence?: {
    nnt?: string
    reference?: string
  }
  duration_limit?: string
  monitoring?: string[]
  goal?: string
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
  name?: string
  dose?: string
  duration?: string
  instructions?: string
  max?: string
}

interface DischargeInstructions {
  return_immediately?: DischargeInstructionItem[]
  follow_up?: DischargeInstructionItem[]
  medications?: DischargeInstructionItem[]
}

interface MedicalAssessmentData {
  immediate_assessment?: ImmediateAssessment
  critical_actions?: CriticalAction[]
  urgent_protocol?: { tasks: string[] }
  diagnostics?: Array<{ test: string; sensitivity?: string; specificity?: string; use_when?: string }>
  hints_exam?: {
    head_impulse?: string
    nystagmus?: string
    test_of_skew?: string
    interpretation?: string
  }
  differential_diagnosis?: DifferentialDiagnosis
  working_diagnosis?: WorkingDiagnosis
  primary_diagnosis_details?: {
    pathophysiology?: string
    diagnostic_criteria?: string
    natural_history?: string
  }
  treatment_by_problem?: TreatmentByProblem[]
  vestibular_rehab?: {
    start_time?: string
    exercises?: Array<{ type: string; technique: string; frequency: string }>
  }
  disposition?: Disposition
  discharge_instructions?: DischargeInstructions
  evidence_base?: Array<{ topic: string; citation: string }>
  reassess_if?: Array<{ trigger: string; action: string }>
  internal_qa?: string
}

// ===================== Helpers =====================
function stripFences(str: string) {
  let s = str.trim()
  if (s.startsWith("```json")) s = s.replace(/^```json[\r\n]*/, "")
  else if (s.startsWith("```")) s = s.replace(/^```[\r\n]*/, "")
  if (s.endsWith("```")) s = s.replace(/```$/, "")
  return s
}

function joinIf(values?: (string | undefined)[], sep = " • ") {
  return (values ?? []).filter(Boolean).join(sep)
}

function kvToLines<T extends KV>(obj?: T): string {
  if (!obj) return ""
  return Object.entries(obj)
    .filter(([, v]) => {
      if (v === null || v === undefined) return false
      if (typeof v === "string" && (v === "N/A" || v === "")) return false
      return true
    })
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
    .join(" • ")
}

// ===================== Small UI Bits =====================
const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-2">
    <Stethoscope className="w-4 h-4 text-blue-300" />
    <h4 className="text-base font-semibold text-blue-300">{title}</h4>
  </div>
)

const MiniTitle: React.FC<{ title: string; className?: string }> = ({ title, className }) => (
  <p className={`text-sm font-semibold text-gray-200 ${className || ""}`}>{title}</p>
)

// ===================== Section Renderers =====================
function ImmediateAssessmentBlock({ data }: { data: ImmediateAssessment }) {
  const d = data.complete_diagnosis
  return (
    <div className="space-y-3">
      <SectionTitle title="Immediate Assessment" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableBody>
          <TableRow>
            <TableCell className="w-48 font-medium">Patient</TableCell>
            <TableCell className="text-gray-200">{data.patient}</TableCell>
          </TableRow>
          {d && (
            <>
              <TableRow>
                <TableCell className="font-medium">Primary Dx</TableCell>
                <TableCell className="text-green-300">{d.primary}</TableCell>
              </TableRow>
              {d.secondary?.length ? (
                <TableRow>
                  <TableCell className="font-medium">Secondary</TableCell>
                  <TableCell className="text-gray-200">{d.secondary.join(" • ")}</TableCell>
                </TableRow>
              ) : null}
              {d.complications?.length ? (
                <TableRow>
                  <TableCell className="font-medium">Complications</TableCell>
                  <TableCell className="text-gray-200">{d.complications.join(" • ")}</TableCell>
                </TableRow>
              ) : null}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function CriticalActionsTable({ items }: { items: CriticalAction[] }) {
  return (
    <div className="space-y-3 mt-6">
      <SectionTitle title="Critical Actions (0–5 min)" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Priority</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Red Flag</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="w-40">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a, i) => (
            <TableRow key={i}>
              <TableCell>
                <Badge variant="destructive">P{a.priority}</Badge>
              </TableCell>
              <TableCell className="text-gray-200">{a.condition}</TableCell>
              <TableCell className="text-gray-300">{a.red_flag || "-"}</TableCell>
              <TableCell className="text-gray-200">{a.action}</TableCell>
              <TableCell className="text-gray-300">{a.evidence || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SimpleTasks({ title, tasks }: { title: string; tasks: string[] }) {
  return (
    <div className="space-y-2 mt-6">
      <MiniTitle title={title} />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableBody>
          {tasks.map((t, i) => (
            <TableRow key={i}>
              <TableCell className="text-gray-200">{t}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DiagnosticsTable({
  items,
}: {
  items: Array<{ test: string; sensitivity?: string; specificity?: string; use_when?: string }>
}) {
  return (
    <div className="space-y-3 mt-6">
      <SectionTitle title="Diagnostics" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Test</TableHead>
            <TableHead>Sensitivity</TableHead>
            <TableHead>Specificity</TableHead>
            <TableHead>Use when</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((d, i) => (
            <TableRow key={i}>
              <TableCell className="text-gray-200">{d.test}</TableCell>
              <TableCell className="text-gray-300">{d.sensitivity || "-"}</TableCell>
              <TableCell className="text-gray-300">{d.specificity || "-"}</TableCell>
              <TableCell className="text-gray-300">{d.use_when || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function HintsTable({
  head_impulse,
  nystagmus,
  test_of_skew,
  interpretation,
}: NonNullable<MedicalAssessmentData["hints_exam"]>) {
  return (
    <div className="space-y-2 mt-6">
      <MiniTitle title="HINTS Exam" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Head Impulse</TableCell>
            <TableCell className="text-gray-200">{head_impulse || "-"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Nystagmus</TableCell>
            <TableCell className="text-gray-200">{nystagmus || "-"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Test of Skew</TableCell>
            <TableCell className="text-gray-200">{test_of_skew || "-"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Interpretation</TableCell>
            <TableCell className="text-gray-200">{interpretation || "-"}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

function DxTierTable({ title, rows }: { title: string; rows: DiagnosisItem[] }) {
  if (!rows || rows.length === 0) return null
  const show = {
    discriminator: rows.some(r => r.discriminator),
    features: rows.some(r => r.features),
    rule_out: rows.some(r => r.rule_out),
    confirm: rows.some(r => r.confirm),
    classic: rows.some(r => r.classic),
    consider_if: rows.some(r => r.consider_if),
    test: rows.some(r => r.test),
    post: rows.some(r => r.post_test_probability),
  }

  return (
    <div className="space-y-2 mt-4">
      <MiniTitle title={title} />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Diagnosis</TableHead>
            <TableHead>Pre-test</TableHead>
            {show.discriminator && <TableHead>Discriminator</TableHead>}
            {show.features && <TableHead>Features</TableHead>}
            {show.classic && <TableHead>Classic</TableHead>}
            {show.rule_out && <TableHead>Rule-out</TableHead>}
            {show.confirm && <TableHead>Confirm</TableHead>}
            {show.consider_if && <TableHead>Consider if</TableHead>}
            {show.test && <TableHead>Test</TableHead>}
            {show.post && <TableHead>Post-test</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="text-gray-200">{r.diagnosis}</TableCell>
              <TableCell className="text-gray-300">{r.pre_test_probability}</TableCell>
              {show.discriminator && <TableCell className="text-gray-300">{r.discriminator || "-"}</TableCell>}
              {show.features && <TableCell className="text-gray-300">{r.features || "-"}</TableCell>}
              {show.classic && <TableCell className="text-gray-300">{r.classic || "-"}</TableCell>}
              {show.rule_out && <TableCell className="text-gray-300">{r.rule_out || "-"}</TableCell>}
              {show.confirm && <TableCell className="text-gray-300">{r.confirm || "-"}</TableCell>}
              {show.consider_if && <TableCell className="text-gray-300">{r.consider_if || "-"}</TableCell>}
              {show.test && <TableCell className="text-gray-300">{r.test || "-"}</TableCell>}
              {show.post && (
                <TableCell className="text-gray-300">{r.post_test_probability || "-"}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function WorkingDiagnosisTable({ data }: { data: WorkingDiagnosis }) {
  return (
    <div className="space-y-3 mt-6">
      <SectionTitle title="Working Diagnosis" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableBody>
          <TableRow>
            <TableCell className="w-48 font-medium">Primary</TableCell>
            <TableCell className="text-green-300">{data.primary}</TableCell>
          </TableRow>
          {data.probability && (
            <TableRow>
              <TableCell className="font-medium">Probability</TableCell>
              <TableCell className="text-gray-200">{data.probability}</TableCell>
            </TableRow>
          )}
          {data.active_problems?.length ? (
            <TableRow>
              <TableCell className="font-medium">Active Problems</TableCell>
              <TableCell className="text-gray-200">{data.active_problems.join(" • ")}</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}

function PrimaryDxDetails({
  pathophysiology,
  diagnostic_criteria,
  natural_history,
}: NonNullable<MedicalAssessmentData["primary_diagnosis_details"]>) {
  if (!pathophysiology && !diagnostic_criteria && !natural_history) return null
  return (
    <div className="space-y-2 mt-6">
      <MiniTitle title="Primary Diagnosis Details" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableBody>
          {pathophysiology && (
            <TableRow>
              <TableCell className="font-medium">Pathophysiology</TableCell>
              <TableCell className="text-gray-200">{pathophysiology}</TableCell>
            </TableRow>
          )}
          {diagnostic_criteria && (
            <TableRow>
              <TableCell className="font-medium">Diagnostic Criteria</TableCell>
              <TableCell className="text-gray-200">{diagnostic_criteria}</TableCell>
            </TableRow>
          )}
          {natural_history && (
            <TableRow>
              <TableCell className="font-medium">Natural History</TableCell>
              <TableCell className="text-gray-200">{natural_history}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function TreatmentTable({ items }: { items: TreatmentByProblem[] }) {
  return (
    <div className="space-y-3 mt-6">
      <SectionTitle title="Treatment Plan (by problem)" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Problem</TableHead>
            <TableHead>Definitive treatment</TableHead>
            <TableHead>Interventions</TableHead>
            <TableHead>Symptom control</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p, i) => (
            <TableRow key={i}>
              <TableCell className="text-gray-200 font-medium">{p.problem}</TableCell>
              <TableCell className="text-gray-300">{kvToLines(p.interventions) || "-"}</TableCell>
              <TableCell className="text-gray-300">
  {kvToLines(p.interventions /* was: as any */) || "-"}
</TableCell>
              <TableCell className="text-gray-300">
                {p.symptom_control
                  ? kvToLines({
                      medication: p.symptom_control.medication,
                      dose: p.symptom_control.dose,
                      max_daily: p.symptom_control.max_daily,
                    })
                  : "-"}
              </TableCell>
              <TableCell className="text-gray-300">
                {joinIf([
                  p.duration_limit ? `Duration limit: ${p.duration_limit}` : undefined,
                  p.monitoring?.length ? `Monitoring: ${p.monitoring.join(", ")}` : undefined,
                  p.goal ? `Goal: ${p.goal}` : undefined,
                  p.evidence?.nnt ? `NNT: ${p.evidence.nnt}` : undefined,
                  p.evidence?.reference ? `Ref: ${p.evidence.reference}` : undefined,
                ]) || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RehabTable({
  start_time,
  exercises,
}: NonNullable<MedicalAssessmentData["vestibular_rehab"]>) {
  if (!start_time && !exercises?.length) return null
  return (
    <div className="space-y-2 mt-6">
      <MiniTitle title="Vestibular Rehab" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Technique</TableHead>
            <TableHead>Frequency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises?.length ? (
            exercises.map((e, i) => (
              <TableRow key={i}>
                {i === 0 ? <TableCell rowSpan={exercises.length}>{start_time || "-"}</TableCell> : null}
                <TableCell className="text-gray-200">{e.type}</TableCell>
                <TableCell className="text-gray-300">{e.technique}</TableCell>
                <TableCell className="text-gray-300">{e.frequency}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="text-gray-200">{start_time || "-"}</TableCell>
              <TableCell colSpan={3} className="text-gray-300">—</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function DispositionTables({ data }: { data: Disposition }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      {data.admit_if?.length ? (
        <div>
          <MiniTitle title="Admit if" />
          <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
            <TableBody>
              {data.admit_if.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-200">{item}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {data.discharge_if_all?.length ? (
        <div>
          <MiniTitle title="Discharge if ALL" />
          <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
            <TableBody>
              {data.discharge_if_all.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-200">{item}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}

function DischargeTables({ data }: { data: DischargeInstructions }) {
  const meds = data.medications ?? []
  return (
    <div className="space-y-3 mt-6">
      <SectionTitle title="Discharge Instructions" />
      {data.return_immediately?.length ? (
        <div className="space-y-2">
          <MiniTitle title="Return immediately if" />
          <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead>Symptom</TableHead>
                <TableHead>Concern</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.return_immediately.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-200">{r.symptom}</TableCell>
                  <TableCell className="text-gray-300">{r.concern}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {data.follow_up?.length ? (
        <div className="space-y-2">
          <MiniTitle title="Follow-up" />
          <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead>Provider / Test</TableHead>
                <TableHead>When / Condition</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.follow_up.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-200">{f.provider || f.test}</TableCell>
                  <TableCell className="text-gray-300">{f.timeframe || f.condition}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {meds.length ? (
        <div className="space-y-2">
          <MiniTitle title="Medications" />
          <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Dose</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meds.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-200">{m.name}</TableCell>
                  <TableCell className="text-gray-300">{m.dose}</TableCell>
                  <TableCell className="text-gray-300">{m.duration || "-"}</TableCell>
                  <TableCell className="text-gray-300">
                    {joinIf([m.max ? `Max: ${m.max}` : undefined, m.instructions]) || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}

function EvidenceTable({ items }: { items: Array<{ topic: string; citation: string }> }) {
  return (
    <div className="space-y-2 mt-6">
      <MiniTitle title="Evidence Base" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Topic</TableHead>
            <TableHead>Citation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="text-gray-200">{e.topic}</TableCell>
              <TableCell className="text-gray-300">{e.citation}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ReassessTable({ items }: { items: Array<{ trigger: string; action: string }> }) {
  return (
    <div className="space-y-2 mt-6">
      <MiniTitle title="Reassess If" />
      <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
        <TableHeader>
          <TableRow>
            <TableHead>Trigger</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="text-gray-200">{e.trigger}</TableCell>
              <TableCell className="text-gray-300">{e.action}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ===================== Main Component =====================
export default function MedicalJsonTabler({
  content,
  data,
  title = "ECDS v5.0 - Emergency Clinical Decision Support",
}: {
  /** Pass the raw assistant `message.content` or a parsed object */
  content?: string
  data?: MedicalAssessmentData
  title?: string
}) {
  let parsed: MedicalAssessmentData | null = null

  if (data) {
    parsed = data
  } else if (content) {
    try {
      parsed = JSON.parse(stripFences(content)) as MedicalAssessmentData
    } catch {
      parsed = null
    }
  }

  // Fallback if not JSON
  if (!parsed) {
    return (
      <Card className="bg-gray-800 border-gray-600 w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            <span className="truncate">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <SectionTitle title="Clinical Assessment" />
          <div className="mt-3 rounded-md bg-blue-900/20 p-4 border-l-4 border-blue-500 text-gray-200 whitespace-pre-wrap">
            {content}
          </div>
        </CardContent>
      </Card>
    )
  }

  const ddx = parsed.differential_diagnosis

  return (
    <Card className="bg-gray-800 border-gray-600 w-full max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
          <Stethoscope className="w-4 h-4" />
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        {parsed.immediate_assessment && <ImmediateAssessmentBlock data={parsed.immediate_assessment} />}

        {parsed.urgent_protocol?.tasks?.length ? (
          <SimpleTasks title="Urgent Protocol" tasks={parsed.urgent_protocol.tasks} />
        ) : null}

        {parsed.critical_actions?.length ? <CriticalActionsTable items={parsed.critical_actions} /> : null}

        {parsed.diagnostics?.length ? <DiagnosticsTable items={parsed.diagnostics} /> : null}

        {parsed.hints_exam && <HintsTable {...parsed.hints_exam} />}

        {ddx && (
          <div className="space-y-2 mt-6">
            <SectionTitle title="Differential Diagnosis" />
            {ddx.tier_1_life_threats && <DxTierTable title="Tier 1 — Life Threats" rows={ddx.tier_1_life_threats} />}
            {ddx.tier_2_urgent && <DxTierTable title="Tier 2 — Urgent" rows={ddx.tier_2_urgent} />}
            {ddx.tier_3_common && <DxTierTable title="Tier 3 — Common" rows={ddx.tier_3_common} />}
            {ddx.tier_4_rare && <DxTierTable title="Tier 4 — Rare" rows={ddx.tier_4_rare} />}
            {ddx.checklist?.length ? (
              <div className="mt-2">
                <MiniTitle title="Checklist" />
                <Table className="bg-zinc-900/40 rounded-md overflow-hidden">
                  <TableBody>
                    {ddx.checklist.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-gray-200">{c}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        )}

        {parsed.working_diagnosis && <WorkingDiagnosisTable data={parsed.working_diagnosis} />}

        {parsed.primary_diagnosis_details && <PrimaryDxDetails {...parsed.primary_diagnosis_details} />}

        {parsed.treatment_by_problem?.length ? <TreatmentTable items={parsed.treatment_by_problem} /> : null}

        {parsed.vestibular_rehab && <RehabTable {...parsed.vestibular_rehab} />}

        {parsed.disposition && <DispositionTables data={parsed.disposition} />}

        {parsed.discharge_instructions && <DischargeTables data={parsed.discharge_instructions} />}

        {parsed.evidence_base?.length ? <EvidenceTable items={parsed.evidence_base} /> : null}

        {parsed.reassess_if?.length ? <ReassessTable items={parsed.reassess_if} /> : null}

        {parsed.internal_qa && <div className="pt-2 text-xs text-gray-400">QA: {parsed.internal_qa}</div>}
      </CardContent>
    </Card>
  )
}
