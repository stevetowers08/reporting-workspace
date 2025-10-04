import { LoadingState } from '@/components/ui/LoadingStates'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('LoadingState Component', () => {
  it('should render loading message', () => {
    render(<LoadingState message="Loading test data..." />)
    expect(screen.getByText('Loading test data...')).toBeInTheDocument()
  })

  it('should render with default message', () => {
    render(<LoadingState />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render with submessage', () => {
    render(
      <LoadingState 
        message="Loading..." 
        submessage="Please wait while we fetch your data" 
      />
    )
    expect(screen.getByText('Please wait while we fetch your data')).toBeInTheDocument()
  })
})
