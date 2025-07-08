import { ReactNode, forwardRef } from 'react'
import { clsx } from 'clsx'

interface MobileContainerProps {
  children: ReactNode
  className?: string
  role?: string
  id?: string
}

export const MobileContainer = forwardRef<HTMLElement, MobileContainerProps>(
  ({ children, className, role = 'main', id = 'main-content' }, ref) => {
    return (
      <main 
        ref={ref}
        role={role}
        id={id}
        className={clsx('w-full max-w-md mx-auto', className)}
        tabIndex={-1} // Allow focus for skip links
      >
        {children}
      </main>
    )
  }
)

MobileContainer.displayName = 'MobileContainer'