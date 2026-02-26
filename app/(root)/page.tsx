import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import InterviewCard from '@/components/InterviewCard'
import { getCurrentUser, getInterviewByUserId } from '@/lib/actions/auth.action'
import { getScheduledInterviews, getInterviewById, getFeedbackByInterviewId } from '@/lib/actions/general.action'
import dayjs from 'dayjs'

const Page = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const [userInterviews, scheduledSessions] = await Promise.all([
    getInterviewByUserId(user.id),
    getScheduledInterviews(user.id)
  ]);

  // Fetch feedback for past interviews to show scores on dashboard
  const userInterviewsWithFeedback = await Promise.all(
    (userInterviews || []).map(async (interview) => {
      const feedback = await getFeedbackByInterviewId({
        interviewId: interview.id,
        userId: user.id,
      });
      return { ...interview, feedback };
    })
  );

  const now = new Date().toISOString();
  const upcomingSchedules = (scheduledSessions || []).filter(s => s.scheduledAt >= now);

  // Fetch actual interview data for valid scheduled interviewId
  const scheduledInterviews = await Promise.all(
    upcomingSchedules
      .filter(s => s.interviewId)
      .map(async (s) => {
        const interview = await getInterviewById(s.interviewId!);
        return interview ? { ...interview, scheduledAt: s.scheduledAt, scheduleTitle: s.title } : null;
      })
  );

  const filteredScheduledInterviews = scheduledInterviews.filter(i => i !== null) as any[];

  const hasPastInterviews = userInterviewsWithFeedback.length > 0;
  const hasUpcomingInterviews = filteredScheduledInterviews.length > 0;

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>

          <p className="text-lg">
            Join MockMate today and ace your job interviews with confidence!
          </p>

          <Button asChild className="btn btn-primary max-sm:w-full">
            <Link href="/interview">Get Started</Link>
          </Button>
        </div>

        <Image src="/robot.png" alt="robot"
          width={400} height={400}
          className="max-sm:hidden" />
      </section>

      <section className='flex flex-col gap-6 mt-8'>
        <h2>Upcoming Scheduled Interviews</h2>

        <div className='interviews-section'>
          {
            hasUpcomingInterviews ? (
              filteredScheduledInterviews.map((interview) => (
                <div key={interview.id} className="relative">
                  <div className="absolute -top-3 left-4 z-10 bg-primary-200 text-dark-100 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    Scheduled: {dayjs(interview.scheduledAt).format("MMM D, HH:mm")}
                  </div>
                  <InterviewCard {...interview} interviewId={interview.id} />
                </div>
              ))) : (
              <div className="flex flex-col gap-4">
                <p className="text-lg text-light-400"> You don&apos;t have any interviews scheduled. </p>
                <Button asChild className="btn btn-secondary w-fit">
                  <Link href="/schedule">Schedule One Now</Link>
                </Button>
              </div>
            )
          }
        </div>
      </section>

      <section className='flex flex-col gap-6 mt-8'>
        <h2>Past Interviews</h2>

        <div className='interviews-section'>
          {
            hasPastInterviews ? (
              userInterviewsWithFeedback.map((interview) => (
                <InterviewCard {...interview} interviewId={interview.id} key={interview.id} feedback={interview.feedback} />
              ))) : (
              <p className="text-lg text-light-400"> You haven&apos;t taken any interviews yet. </p>
            )
          }
        </div>
      </section>
    </>
  )
}

export default Page