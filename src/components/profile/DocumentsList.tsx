import { Download, FileText } from "lucide-react"
import Card from "../ui/Card"
import StatusPill from "../ui/StatusPill"
import EmptyState from "../ui/EmptyState"
import type { DocumentRecord } from "../../types"
import { buildIssuedDocumentText, downloadTextFile } from "../../lib/downloadMock"

interface EmployeeInfo {
  name: string
  employeeId: string
  department: string
  designation: string
}

export default function DocumentsList({ documents, employee }: { documents: DocumentRecord[]; employee: EmployeeInfo }) {
  function handleDownload(doc: DocumentRecord) {
    const content = buildIssuedDocumentText({
      title: doc.name.replace(/\.pdf$/i, ""),
      employeeName: employee.name,
      employeeId: employee.employeeId,
      department: employee.department,
      designation: employee.designation,
      issuedOn: new Date().toISOString().slice(0, 10),
    })
    downloadTextFile(`${doc.name.replace(/\.pdf$/i, "")}.txt`, content)
  }

  return (
    <Card delay={0.15}>
      <h2 className="mb-3 text-sm font-semibold text-slate">Documents</h2>
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" />
      ) : (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink/2">
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-slate" />
                <div>
                  <p className="text-sm text-ink">{doc.name}</p>
                  {doc.expiresOn && <p className="text-xs text-slate font-mono-tabular">Expires {doc.expiresOn}</p>}
                  {doc.rejectionReason && <p className="text-xs text-rose">{doc.rejectionReason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={doc.status} />
                {doc.kind === "issued" && (
                  <button
                    onClick={() => handleDownload(doc)}
                    title={`Download ${doc.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate hover:bg-meridian-dim hover:text-meridian"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
