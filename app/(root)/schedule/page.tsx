import { getCurrentUser, getInterviewByUserId } from "@/lib/actions/auth.action";
import {
    deleteScheduledInterview,
    getScheduledInterviews,
} from "@/lib/actions/general.action";
import { redirect } from "next/navigation";
import ScheduleForm from "@/components/ScheduleForm";
import dayjs from "dayjs";
import Link from "next/link";

const SchedulePage = async () => {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const [scheduled, userInterviews] = await Promise.all([
        getScheduledInterviews(user.id),
        getInterviewByUserId(user.id),
    ]);

    const now = new Date().toISOString();
    const upcoming = (scheduled || []).filter((s: ScheduledInterview) => s.scheduledAt >= now);
    const past = (scheduled || []).filter((s: ScheduledInterview) => s.scheduledAt < now);

    return (
        <div className="schedule-page">
            {/* Header */}
            <div className="schedule-header">
                <div>
                    <h1 className="schedule-title">Schedule an Interview</h1>
                    <p className="schedule-subtitle">
                        Plan your practice sessions and never miss a preparation window.
                    </p>
                </div>
            </div>

            <div className="schedule-grid">
                {/* Form */}
                <div className="schedule-form-card">
                    <h2 className="schedule-section-title">📅 Book a Session</h2>
                    <ScheduleForm
                        userInterviews={(userInterviews || []).map((i: Interview) => ({
                            id: i.id,
                            role: i.role,
                            level: i.level,
                        }))}
                    />
                </div>

                {/* Upcoming */}
                <div className="schedule-list-area">
                    <div className="schedule-card">
                        <h2 className="schedule-section-title">⏰ Upcoming Sessions</h2>
                        {upcoming.length === 0 ? (
                            <p className="schedule-empty">No upcoming sessions scheduled.</p>
                        ) : (
                            <div className="schedule-items">
                                {upcoming.map((s: ScheduledInterview) => (
                                    <div key={s.id} className="schedule-item upcoming-item">
                                        <div className="schedule-item-header">
                                            <h3 className="schedule-item-title">{s.title}</h3>
                                            <span className="schedule-badge upcoming-badge">
                                                Upcoming
                                            </span>
                                        </div>
                                        <p className="schedule-item-date">
                                            📅 {dayjs(s.scheduledAt).format("MMM D, YYYY [at] h:mm A")}
                                        </p>
                                        {s.notes && (
                                            <p className="schedule-item-notes">📝 {s.notes}</p>
                                        )}
                                        {s.interviewId && (
                                            <Link
                                                href={`/interview/${s.interviewId}`}
                                                className="schedule-start-link"
                                            >
                                                Start Interview →
                                            </Link>
                                        )}
                                        <form
                                            action={async () => {
                                                "use server";
                                                await deleteScheduledInterview(s.id);
                                            }}
                                        >
                                            <button type="submit" className="schedule-delete-btn">
                                                Cancel
                                            </button>
                                        </form>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Past */}
                    {past.length > 0 && (
                        <div className="schedule-card">
                            <h2 className="schedule-section-title">✅ Past Sessions</h2>
                            <div className="schedule-items">
                                {past.map((s: ScheduledInterview) => (
                                    <div key={s.id} className="schedule-item past-item">
                                        <div className="schedule-item-header">
                                            <h3 className="schedule-item-title">{s.title}</h3>
                                            <span className="schedule-badge past-badge">Past</span>
                                        </div>
                                        <p className="schedule-item-date">
                                            📅 {dayjs(s.scheduledAt).format("MMM D, YYYY [at] h:mm A")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
