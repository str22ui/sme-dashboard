'use client'

export default function ProgressIndicator({ currentPage, pageName }) {
  const pages = [
    { id: -1, name: 'Realisasi', short: 'Rea' },
    { id: 0, name: 'Dashboard', short: 'Dash' },
    { id: 1, name: 'Jakarta I', short: 'Jkt1' },
    { id: 2, name: 'Jakarta II', short: 'Jkt2' },
    { id: 3, name: 'Jateng DIY', short: 'JTG' },
    { id: 4, name: 'Jabanus', short: 'JBN' },
    { id: 5, name: 'Jawa Barat', short: 'JBR' },
    { id: 6, name: 'Kalimantan', short: 'KAL' },
    { id: 7, name: 'Sulampua', short: 'SLP' },
    { id: 8, name: 'Sumatera 1', short: 'SM1' },
    { id: 9, name: 'Sumatera 2', short: 'SM2' },
  ]
  
  return (
    <div className="fixed bottom-8 left-0 right-0 flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-sm px-8 py-4 rounded-full shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Navigation dots */}
          <div className="flex items-center gap-2">
            {pages.map((page) => {
              const isActive = page.id === currentPage
              
              return (
                <div
                  key={page.id}
                  className={`
                    transition-all duration-300 rounded-full
                    ${isActive 
                      ? 'w-4 h-4 bg-primary scale-125 shadow-lg shadow-primary/50' 
                      : 'w-2.5 h-2.5 bg-gray-500 hover:bg-gray-400'
                    }
                  `}
                  title={page.name}
                />
              )
            })}
          </div>
          
          {/* Current page info */}
          <div className="ml-4 flex items-center gap-3 border-l border-gray-600 pl-4">
            <span className="text-gray-400 text-sm">Halaman:</span>
            <span className="text-white font-semibold text-lg">
              {pageName}
            </span>
            <span className="text-gray-500 text-sm">
              ({currentPage + 2}/11)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
