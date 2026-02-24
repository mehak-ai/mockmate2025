import { getCurrentUser, getInterviewByUserId } from "@/lib/actions/auth.action";
import {
    getFeedbackByInterviewId,
} from "@/lib/actions/general.action";
import { redirect } from "next/navigation";
import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { getRandomInterviewCover } from "@/lib/utils";

const InterviewsPage = async () => {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const interviews = await getInterviewByUserId(user.id);

    if (!interviews || interviews.length === 0) {
        return (
            <div className="interviews-history-page">
                <h1 className="history-title">My Interviews</h1>
                <div className="history-empty">
                    <p>You haven&apos;t taken any interviews yet.</p>
                    <Link href="/" className="btn btn-primary history-empty-btn">
                        Browse Interviews
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch feedback for all interviews in parallel
    const feedbacks = await Promise.all(
        interviews.map((interview: Interview) =>
            getFeedbackByInterviewId({
                interviewId: interview.id,
                userId: user.id,
            }).catch(() => null)
        )
    );

    return (
        <div className="interviews-history-page">
            <div className="history-header">
                <h1 className="history-title">My Interview History</h1>
                <p className="history-subtitle">
                    {interviews.length} interview{interviews.length !== 1 ? "s" : ""} completed
                </p>
            </div>

            <div className="history-list">
                {interviews.map((interview: Interview, idx: number) => {
                    const feedback = feedbacks[idx];
                    const hasFeedback = !!feedback;

                    return (
                        <div key={interview.id} className="history-card">
                            {/* Card Header */}
                            <div className="history-card-header">
                                <div className="history-card-info">
                                    <Image
                                        src={getRandomInterviewCover()}
                                        alt="cover"
                                        width={56}
                                        height={56}
                                        className="rounded-full object-cover size-[56px]"
                                    />
                                    <div>
                                        <h2 className="history-card-title capitalize">
                                            {interview.role} Interview
                                        </h2>
                                        <p className="history-card-meta">
                                            {interview.level} · {interview.type} ·{" "}
                                            {dayjs(interview.createdAt).format("MMM D, YYYY")}
                                        </p>
                                    </div>
                                </div>

                                {hasFeedback && (
                                    <div className="history-score-badge">
                                        <span className="history-score-number">
                                            {feedback!.totalScore}
                                        </span>
                                        <span className="history-score-label">/100</span>
                                    </div>
                                )}
                            </div>

                            {/* Techstack */}
                            {interview.techstack?.length > 0 && (
                                <div className="history-tags">
                                    {interview.techstack.map((tech: string, i: number) => (
                                        <span key={i} className="history-tag">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Questions Preview */}
                            {interview.questions?.length > 0 && (
                                <div className="history-questions">
                                    <h3 className="history-questions-title">
                                        Interview Questions ({interview.questions.length})
                                    </h3>
                                    <ul className="history-question-list">
                                        {interview.questions.map((q: string, i: number) => (
                                            <li key={i} className="history-question-item">
                                                <span className="history-q-number">Q{i + 1}.</span>
                                                <span>{q}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Feedback Summary */}
                            {hasFeedback && (
                                <div className="history-feedback-summary">
                                    <div className="history-feedback-cols">
                                        <div className="history-feedback-col">
                                            <h3 className="history-feedback-col-title strength-title">
                                                ✅ Strengths
                                            </h3>
                                            <ul>
                                                {feedback!.strengths.slice(0, 2).map((s: string, i: number) => (
                                                    <li key={i} className="history-feedback-point strength-point">
                                                        {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="history-feedback-col">
                                            <h3 className="history-feedback-col-title improvement-title">
                                                🎯 Improve
                                            </h3>
                                            <ul>
                                                {feedback!.areasForImprovement.slice(0, 2).map((a: string, i: number) => (
                                                    <li key={i} className="history-feedback-point improvement-point">
                                                        {a}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Score Bars */}
                                    <div className="history-score-bars">
                                        {feedback!.categoryScores.map((cat: { name: string; score: number; comment: string }, i: number) => (
                                            <div key={i} className="history-score-bar-item">
                                                <div className="history-score-bar-header">
                                                    <span className="history-score-bar-name">
                                                        {cat.name}
                                                    </span>
                                                    <span
                                                        className={`history-score-bar-value ${cat.score >= 75
                                                                ? "score-high"
                                                                : cat.score >= 50
                                                                    ? "score-mid"
                                                                    : "score-low"
                                                            }`}
                                                    >
                                                        {cat.score}
                                                    </span>
                                                </div>
                                                <div className="history-progress-bar">
                                                    <div
                                                        className={`history-progress-fill ${cat.score >= 75
                                                                ? "fill-high"
                                                                : cat.score >= 50
                                                                    ? "fill-mid"
                                                                    : "fill-low"
                                                            }`}
                                                        style={{ width: `${cat.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="history-actions">
                                {hasFeedback ? (
                                    <Link
                                        href={`/interview/${interview.id}/feedback`}
                                        className="history-btn history-btn-primary"
                                    >
                                        View Full Feedback
                                    </Link>
                                ) : (
                                    <Link
                                        href={`/interview/${interview.id}`}
                                        className="history-btn history-btn-secondary"
                                    >
                                        Take Interview
                                    </Link>
                                )}
                                {hasFeedback && (
                                    <Link
                                        href={`/interview/${interview.id}`}
                                        className="history-btn history-btn-secondary"
                                    >
                                        Retake Interview
                                    </Link>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default InterviewsPage;
