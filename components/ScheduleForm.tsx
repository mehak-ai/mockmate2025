"use client";

import { useState } from "react";
import { scheduleInterview } from "@/lib/actions/general.action";
import { useRouter } from "next/navigation";

interface Props {
    userInterviews: { id: string; role: string; level: string }[];
}

const ScheduleForm = ({ userInterviews }: Props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        title: "",
        scheduledAt: "",
        interviewId: "",
        notes: "",
    });

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.scheduledAt) return;
        setLoading(true);

        const result = await scheduleInterview({
            title: form.title,
            scheduledAt: new Date(form.scheduledAt).toISOString(),
            interviewId: form.interviewId || undefined,
            notes: form.notes || undefined,
        });

        setLoading(false);
        if (result.success) {
            setSuccess(true);
            setForm({ title: "", scheduledAt: "", interviewId: "", notes: "" });
            setTimeout(() => {
                setSuccess(false);
                router.refresh();
            }, 1500);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="schedule-form">
            {success && (
                <div className="schedule-success">
                    ✅ Session scheduled successfully!
                </div>
            )}

            {/* Title */}
            <div className="schedule-field">
                <label className="schedule-label">Session Title *</label>
                <input
                    name="title"
                    type="text"
                    placeholder="e.g. Frontend React Interview Practice"
                    value={form.title}
                    onChange={handleChange}
                    className="schedule-input"
                    required
                />
            </div>

            {/* Date & Time */}
            <div className="schedule-field">
                <label className="schedule-label">Date & Time *</label>
                <input
                    name="scheduledAt"
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={handleChange}
                    className="schedule-input schedule-input-date"
                    required
                />
            </div>

            {/* Link to interview */}
            <div className="schedule-field">
                <label className="schedule-label">
                    Link to Interview (optional)
                </label>
                <select
                    name="interviewId"
                    value={form.interviewId}
                    onChange={handleChange}
                    className="schedule-input schedule-select"
                >
                    <option value="">-- Select an interview --</option>
                    {userInterviews.map((i) => (
                        <option key={i.id} value={i.id}>
                            {i.role} ({i.level})
                        </option>
                    ))}
                </select>
            </div>

            {/* Notes */}
            <div className="schedule-field">
                <label className="schedule-label">Notes (optional)</label>
                <textarea
                    name="notes"
                    placeholder="Topics to focus on, goals for this session..."
                    value={form.notes}
                    onChange={handleChange}
                    className="schedule-input schedule-textarea"
                    rows={3}
                />
            </div>

            <button type="submit" disabled={loading} className="schedule-submit-btn">
                {loading ? "Scheduling..." : "Schedule Session"}
            </button>
        </form>
    );
};

export default ScheduleForm;
