import { ReactNode } from 'react'
import Link from 'next/link'

const RootLayout = ({ children }: { children:ReactNode }) => {
  return (
    <div className="root-layout">
      <nav>
        <Link href="/" className="flex items-center gap-2">
        <h2 className="text-primary-100">MockMate</h2>
        </Link>
      </nav>
      {children}
    </div>
  )
}

export default RootLayout