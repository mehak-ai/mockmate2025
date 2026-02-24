import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";

const FeedbackPage = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [interview, feedback] = await Promise.all([
    getInterviewById(id),
    getFeedbackByInterviewId({ interviewId: id, userId: user.id }),
  ]);

  if (!interview) redirect("/");

  return (
    <section className="section-feedback">
      {/* Header */}
      <div className="feedback-header">
        <div className="feedback-header-left">
          <h1 className="feedback-title">Interview Feedback</h1>
          <p className="feedback-subtitle">
            {interview.role} · {interview.level} · {interview.type}
          </p>
        </div>
        {feedback && (
          <div className="feedback-score-circle">
            <span className="feedback-score-number">{feedback.totalScore}</span>
            <span className="feedback-score-label">/ 100</span>
          </div>
        )}
      </div>

      {feedback ? (
        <>
          {/* Date */}
          <p className="feedback-date">
            Completed on{" "}
            {dayjs(feedback.createdAt).format("MMMM D, YYYY [at] h:mm A")}
          </p>

          {/* Final Assessment */}
          <div className="feedback-card">
            <h2 className="feedback-section-title">📋 Final Assessment</h2>
            <p className="feedback-assessment-text">{feedback.finalAssessment}</p>
          </div>

          {/* Scores Breakdown */}
          <div className="feedback-card">
            <h2 className="feedback-section-title">📊 Score Breakdown</h2>
            <div className="feedback-scores-grid">
              {feedback.categoryScores.map((cat, i) => (
                <div key={i} className="feedback-score-item">
                  <div className="feedback-score-item-header">
                    <span className="feedback-score-item-name">{cat.name}</span>
                    <span
                      className={`feedback-score-item-value ${
                        cat.score >= 75
                          ? "score-high"
                          : cat.score >= 50
                          ? "score-mid"
                          : "score-low"
                      }`}
                    >
                      {cat.score}/100
                    </span>
                  </div>
                  <div className="feedback-progress-bar">
                    <div
                      className={`feedback-progress-fill ${
                        cat.score >= 75
                          ? "fill-high"
                          : cat.score >= 50
                          ? "fill-mid"
                          : "fill-low"
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  <p className="feedback-score-comment">{cat.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="feedback-two-col">
            {/* Strengths */}
            <div className="feedback-card feedback-strengths">
              <h2 className="feedback-section-title">✅ Strengths</h2>
              <ul className="feedback-list">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="feedback-list-item strength-item">
                    <span className="feedback-list-dot strength-dot">●</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="feedback-card feedback-improvements">
              <h2 className="feedback-section-title">🎯 Areas for Improvement</h2>
              <ul className="feedback-list">
                {feedback.areasForImprovement.map((a, i) => (
                  <li key={i} className="feedback-list-item improvement-item">
                    <span className="feedback-list-dot improvement-dot">●</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <div className="feedback-card text-center py-12">
          <p className="text-xl text-light-100">
            No feedback available for this interview yet.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="buttons">
        <Button asChild className="btn btn-secondary">
          <Link href="/">Back to Dashboard</Link>
        </Button>
        <Button asChild className="btn btn-primary">
          <Link href={`/interview/${id}`}>Retake Interview</Link>
        </Button>
        <Button asChild className="btn btn-secondary">
          <Link href="/interviews">View All Interviews</Link>
        </Button>
      </div>
    </section>
  );
};

export default FeedbackPage;
