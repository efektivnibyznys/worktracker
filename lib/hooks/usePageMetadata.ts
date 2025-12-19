import { useEffect } from 'react'

interface PageMetadata {
  title: string
  description?: string
}

export function usePageMetadata({ title, description }: PageMetadata) {
  useEffect(() => {
    document.title = title

    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', description)
    }
  }, [title, description])
}
