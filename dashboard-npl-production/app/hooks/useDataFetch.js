'use client'

import { useState, useEffect } from 'react'

export function useDataFetch(dataType, refreshInterval = 30000) {
  const [data, setData] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch metadata
        const metaResponse = await fetch(`/api/data/${dataType}/metadata`)
        if (metaResponse.ok) {
          const meta = await metaResponse.json()
          setMetadata(meta)
        }
        
        // Fetch parsed data
        const dataResponse = await fetch(`/api/data/${dataType}/parsed`)
        if (dataResponse.ok) {
          const parsedData = await dataResponse.json()
          setData(parsedData)
          setLoading(false)
        } else {
          throw new Error('Failed to fetch data')
        }
        
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    
    // Fetch immediately
    fetchData()
    
    // Then every X seconds
    const interval = setInterval(fetchData, refreshInterval)
    
    return () => clearInterval(interval)
  }, [dataType, refreshInterval])
  
  return { data, metadata, loading, error }
}
