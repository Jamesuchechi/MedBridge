"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Stethoscope, 
  Filter,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  type: string;
  reason: string;
  patient: { name: string };
  doctor: { name: string };
}

export default function AppointmentsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([]);
  const [clinicPatients, setClinicPatients] = useState<{ id: string; name: string }[]>([]);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      const res = await fetch(`/api/v1/appointments?startDate=${start}&endDate=${end}`);
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth]);

  const fetchStaffAndPatients = useCallback(async () => {
    try {
      const [staffRes, patientsRes] = await Promise.all([
        fetch("/api/v1/clinics/staff"),
        fetch("/api/v1/patients")
      ]);
      setStaff(await staffRes.json());
      const pData = await patientsRes.json();
      setClinicPatients(pData.patients || pData);
    } catch (err) {
      console.error("Failed to fetch dependencies:", err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchStaffAndPatients();
  }, [fetchStaffAndPatients]);

  const handleUpdateStatus = async (id: string, status: string) => {
     try {
       await fetch(`/api/v1/appointments/${id}/status`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ status })
       });
       fetchAppointments();
     } catch (err) {
       console.error("Failed to update status:", err);
     }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const filteredAppointments = appointments.filter(app => isSameDay(new Date(app.startTime), selectedDate));

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Clinic Schedule</h1>
          <p className="text-slate-400 mt-2">Manage patient visits, doctor availability, and clinic workflow.</p>
        </div>
        <button 
          onClick={() => setIsBookingOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Book Appointment
        </button>
      </div>

      {isBookingOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold text-white">Quick Book</h2>
               <button onClick={() => setIsBookingOpen(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-slate-400">Select a patient and doctor to create an appointment manually.</p>
            <div className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Patient</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200">
                     <option>Select Patient ({clinicPatients.length})</option>
                     {clinicPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Doctor</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200">
                     <option>Select Doctor ({staff.filter(s => s.role === 'CLINICIAN').length})</option>
                     {staff.filter(s => s.role === 'CLINICIAN').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-all">Proceed to Time Selection</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Pillar: Navigation & Calendar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-1">
                 <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                 </button>
                 <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map(d => <div key={d} className="p-2">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => {
                const day = addDays(startOfWeek(startOfMonth(currentMonth)), i);
                const isSelected = isSameDay(day, selectedDate);
                const hasAppts = appointments.some(a => isSameDay(new Date(a.startTime), day));

                return (
                  <button 
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      p-3 text-sm rounded-xl transition-all relative
                      ${isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}
                    `}
                  >
                    {format(day, "d")}
                    {hasAppts && !isSelected && (
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Search & Filters</h3>
             <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search patient or doctor..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-all group">
                   <Filter className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                   <span className="text-sm text-slate-300">Advanced Filters</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Pillar: Agenda View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
               Agenda for {format(selectedDate, "MMM d, yyyy")}
               <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
                 {filteredAppointments.length} visits
               </span>
            </h2>
          </div>

          <div className="space-y-4">
             {isLoading ? (
               <div className="p-20 flex justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
               </div>
             ) : filteredAppointments.length === 0 ? (
               <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-16 text-center">
                  <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">No appointments scheduled for this day.</p>
                  <button className="text-blue-400 text-sm font-bold mt-2 hover:underline">Book a slot</button>
               </div>
             ) : (
               filteredAppointments.map(appt => (
                 <div key={appt.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:border-blue-500/40 transition-all group relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      appt.status === "confirmed" ? "bg-emerald-500" : 
                      appt.status === "pending" ? "bg-amber-500" : 
                      appt.status === "cancelled" ? "bg-rose-500" : "bg-slate-500"
                    }`} />
                    
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                       <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4 text-slate-400">
                             <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-slate-200">
                                <Clock className="w-4 h-4 text-blue-400" />
                                {format(new Date(appt.startTime), "HH:mm")} - {format(new Date(appt.endTime), "HH:mm")}
                             </div>
                             <span className="w-1 h-1 bg-slate-700 rounded-full" />
                             <div className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                                {appt.type}
                             </div>
                          </div>

                          <div className="flex items-start gap-4">
                             <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                                <User className="w-6 h-6" />
                             </div>
                             <div>
                                <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors cursor-pointer">{appt.patient.name}</h3>
                                <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                                   <Stethoscope className="w-3 h-3" />
                                   Dr. {appt.doctor.name}
                                </div>
                             </div>
                          </div>
                          {appt.reason && (
                            <p className="text-slate-400 text-sm italic">"{appt.reason}"</p>
                          )}
                       </div>

                       <div className="flex flex-row md:flex-col justify-between items-end gap-3 shrink-0">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-tight ${
                             appt.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                             appt.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                             "bg-slate-800 text-slate-400 border-slate-700"
                          }`}>
                             {appt.status}
                          </span>
                          
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {appt.status === "pending" && (
                               <button 
                                 onClick={() => handleUpdateStatus(appt.id, "confirmed")}
                                 className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                 title="Confirm Appointment"
                               >
                                 <CheckCircle2 className="w-4 h-4" />
                               </button>
                             )}
                             <button 
                               onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                               className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                               title="Cancel Appointment"
                             >
                                <XCircle className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
