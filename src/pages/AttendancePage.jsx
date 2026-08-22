import PageHeader from '../components/ui/PageHeader'
import CheckInOutWidget from '../components/attendance/CheckInOutWidget'
import AttendanceChart from '../components/attendance/AttendanceChart'
import AttendanceList from '../components/attendance/AttendanceList'
import { useStore } from '../lib/store'

export default function AttendancePage() {
  const { attendance } = useStore()

  return (
    <div>
      <PageHeader eyebrow="Attendance" title="Your attendance" subtitle="Track your check-ins and time-off at a glance." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CheckInOutWidget />
        </div>
        <div className="lg:col-span-2">
          <AttendanceChart records={attendance} />
        </div>
      </div>

      <div className="mt-4">
        <AttendanceList records={attendance} />
      </div>
    </div>
  )
}
