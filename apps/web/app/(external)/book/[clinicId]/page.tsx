"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Calendar as CalendarIcon, Stethoscope, ChevronLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";

export default function PatientBookingPage() {
  const params = useParams();
  const clinicId = params.clinicId as string;

  const [doctors, setDoctors] = useState<{ id: string; fullName: string; specialization: string }[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [step, setStep] = useState(1); // 1: Doctor, 2: Date/Slot, 3: Confirm
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/doctors/search?clinicId=${clinicId}`);
      const data = await res.json();
      setDoctors(data);
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    }
  }, [clinicId]);

  useEffect(() => {
    if (clinicId) fetchDoctors();
  }, [clinicId, fetchDoctors]);

  const fetchSlots = useCallback(async () => {
    if (!selectedDoctor) return;
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(`/api/v1/appointments/slots?doctorId=${selectedDoctor}&date=${dateStr}`);
      const data = await res.json();
      setAvailableSlots(data);
    } catch (err) {
      console.error("Failed to fetch slots:", err);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots();
    }
  }, [selectedDoctor, selectedDate, fetchSlots]);

  const handleBooking = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          doctorId: selectedDoctor,
          patientId: "CURRENT_USER_ID", // This should be handled by the backend from token/session
          startTime: selectedSlot!.start,
          endTime: selectedSlot!.end,
          reason,
          type: "consultation"
        })
      });

      if (res.ok) {
        setIsSuccess(true);
      }
    } catch (err) {
      console.error("Booking failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-8 mt-20 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white">Appointment Requested!</h1>
        <p className="text-slate-400">Your appointment has been sent to the clinic for confirmation. You will receive an email once it's approved.</p>
        <button onClick={() => window.location.href = "/dashboard"} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Book a Consultation</h1>
        <p className="text-slate-400">Select a specialist and a convenient time slot to schedule your visit.</p>
      </div>

      <div className="flex justify-center gap-4 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === s ? "bg-blue-600 text-white" : 
              step > s ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"
            }`}>
              {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className="w-12 h-0.5 bg-slate-800" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-bold text-white mb-4">Choose a Specialist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map(doc => (
              <div 
                key={doc.id}
                onClick={() => { setSelectedDoctor(doc.id); setStep(2); }}
                className={`p-6 bg-slate-900 border ${selectedDoctor === doc.id ? "border-blue-500" : "border-slate-800"} rounded-2xl cursor-pointer hover:border-blue-500/50 transition-all group`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Stethoscope className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">{doc.fullName}</h3>
                    <p className="text-sm text-slate-500">{doc.specialization}</p>
                    <div className="flex items-center gap-1 mt-2 text-amber-500 text-xs font-bold">
                       <span className="px-2 py-0.5 bg-amber-500/10 rounded">Next Available: Today</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-4">
              <button onClick={() => setStep(1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft/></button>
              <h2 className="text-xl font-bold text-white">Select Date & Time</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Available Days</h3>
                 <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => {
                      const day = addDays(new Date(), i);
                      const isSelected = isSameDay(day, selectedDate);
                      return (
                        <button 
                          key={i}
                          onClick={() => setSelectedDate(day)}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            isSelected ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                           <div className="text-[10px] font-black uppercase opacity-60 mb-1">{format(day, "EEE")}</div>
                           <div className="text-lg font-bold">{format(day, "d")}</div>
                        </button>
                      );
                    })}
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Available Slots</h3>
                 <div className="grid grid-cols-3 gap-2">
                    {availableSlots.length === 0 ? (
                      <div className="col-span-3 p-8 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
                        No slots available for this day.
                      </div>
                    ) : availableSlots.map((slot, i) => (
                      <button 
                        key={i}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                          selectedSlot === slot ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                         {format(new Date(slot.start), "HH:mm")}
                      </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="flex justify-end pt-8">
              <button 
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
                className="bg-blue-600 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20"
              >
                Continue
              </button>
           </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
           <div className="flex items-center gap-4">
              <button onClick={() => setStep(2)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft/></button>
              <h2 className="text-xl font-bold text-white">Confirm Your Appointment</h2>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Doctor</label>
                    <div className="flex items-center gap-3 text-white font-bold text-lg">
                       <Stethoscope className="w-5 h-5 text-blue-500" />
                       {doctors.find(d => d.id === selectedDoctor)?.fullName}
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Time & Date</label>
                    <div className="flex items-center gap-3 text-white font-bold text-lg">
                       <CalendarIcon className="w-5 h-5 text-blue-500" />
                       {format(selectedDate, "MMM d, yyyy")} at {selectedSlot ? format(new Date(selectedSlot.start), "HH:mm") : "..."}
                    </div>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason for Visit</label>
                 <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly describe your symptoms or reason for the visit..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px]"
                 />
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex gap-3 text-sm text-slate-400">
                 <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                 <p>By confirming, you agree to the clinic's terms and privacy policy. You can cancel up to 24 hours before the appointment.</p>
              </div>

              <button 
                onClick={handleBooking}
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl font-bold text-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Confirm Booking"}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
