import { Component } from 'react'
import NutrinoLogo from './NutrinoLogo'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
          <NutrinoLogo className="mb-6" />
          <p className="text-gray-900 font-semibold text-lg mb-2">Something went wrong</p>
          <p className="text-gray-400 text-sm mb-8">An unexpected error occurred. Reload to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-green-600 text-white rounded-2xl font-semibold text-sm"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
