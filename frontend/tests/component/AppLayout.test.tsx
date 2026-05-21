import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlatformIcon } from '@/components/PlatformIcon'

describe('PlatformIcon', () => {
  it('renders an icon for a known platform', () => {
    render(<PlatformIcon platform="twitter" />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '24')
  })

  it('renders a fallback icon for unknown platforms', () => {
    render(<PlatformIcon platform="unknown_platform" />)
    const svg = document.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<PlatformIcon platform="github" className="custom-class" />)
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(span).toHaveClass('custom-class')
  })

  it('renders with custom size', () => {
    render(<PlatformIcon platform="linkedin" size={32} />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
  })
})
