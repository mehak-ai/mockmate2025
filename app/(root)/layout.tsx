import { ReactNode } from 'react'
import Link from 'next/link'
import { isAuthenticated } from '@/lib/actions/auth.action'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/actions/auth.action'

const RootLayout = async ({ children }: { children: ReactNode }) => {

  const isUserAuthenticated = await isAuthenticated();

  if (!isUserAuthenticated) redirect('/sign-in');
  return (
    <div className="root-layout">
      <nav className="root-nav">
        <Link href="/" className="flex items-center gap-2">
          <h2 className="text-primary-100">MockMate</h2>
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/interviews" className="nav-link">My Interviews</Link>
          <Link href="/schedule" className="nav-link">Schedule</Link>
          <form action={async () => { "use server"; await signOut(); redirect('/sign-in'); }}>
            <button type="submit" className="nav-link nav-signout">Sign Out</button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  )
}

export default RootLayout
