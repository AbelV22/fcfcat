'use client'

import { useRef, useState, useCallback } from 'react'
import { Download, Share2, Loader2 } from 'lucide-react'

interface ExportRivalPdfProps {
  children: React.ReactNode
  rivalName: string
  teamName: string
  jornada: number
  matchDate: string
}

export default function ExportRivalPdf({
  children,
  rivalName,
  teamName,
  jornada,
  matchDate,
}: ExportRivalPdfProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [sharing, setSharing] = useState(false)

  const generatePdf = useCallback(async (): Promise<Blob | null> => {
    if (!contentRef.current) return null

    const html2canvas = (await import('html2canvas-pro')).default
    const { jsPDF } = await import('jspdf')

    // Capture the content with a white-ish background for readability
    const el = contentRef.current

    // Create a clone for PDF rendering with light theme overrides
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.position = 'fixed'
    clone.style.top = '-99999px'
    clone.style.left = '0'
    clone.style.width = '800px'
    clone.style.padding = '32px'
    clone.style.background = 'linear-gradient(135deg, #0c1222 0%, #162033 50%, #0c1222 100%)'
    clone.style.zIndex = '-1'
    document.body.appendChild(clone)

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0c1222',
        logging: false,
        width: 800,
        windowWidth: 800,
      })

      document.body.removeChild(clone)

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF('p', 'mm', 'a4')
      const totalPages = Math.ceil(imgHeight / pageHeight)

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage()

        // Add background
        pdf.setFillColor(12, 18, 34)
        pdf.rect(0, 0, imgWidth, pageHeight, 'F')

        // Add content image
        const yOffset = -(page * pageHeight)
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          0,
          yOffset,
          imgWidth,
          imgHeight
        )

        // Watermark on every page — diagonal repeated pattern
        pdf.saveGraphicsState()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }))
        pdf.setFontSize(48)
        pdf.setTextColor(255, 255, 255)
        // Place watermarks in a grid pattern
        for (let wy = 40; wy < pageHeight; wy += 80) {
          for (let wx = 20; wx < imgWidth + 40; wx += 90) {
            pdf.text('NeoScout', wx, wy, { angle: -35 })
          }
        }
        pdf.restoreGraphicsState()

        // Header bar on first page
        if (page === 0) {
          // Top accent line
          pdf.setFillColor(0, 210, 255) // cyan
          pdf.rect(0, 0, imgWidth, 2.5, 'F')
        }

        // Footer on every page
        pdf.setFontSize(8)
        pdf.setTextColor(120, 140, 170)
        pdf.text(
          `NeoScout — Informe Rival: ${rivalName} (J${jornada})`,
          imgWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        )
        pdf.text(
          `${page + 1}/${totalPages}`,
          imgWidth - 10,
          pageHeight - 6,
          { align: 'right' }
        )
      }

      return pdf.output('blob')
    } catch (err) {
      console.error('PDF generation error:', err)
      // Clean up clone if still in DOM
      if (clone.parentNode) document.body.removeChild(clone)
      return null
    }
  }, [rivalName, jornada])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const blob = await generatePdf()
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `NeoScout_Rival_${rivalName.replace(/\s+/g, '_')}_J${jornada}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [generatePdf, rivalName, jornada])

  const handleShare = useCallback(async () => {
    setSharing(true)
    try {
      const blob = await generatePdf()
      if (!blob) return

      const fileName = `NeoScout_Rival_${rivalName.replace(/\s+/g, '_')}_J${jornada}.pdf`
      const file = new File([blob], fileName, { type: 'application/pdf' })

      // Try Web Share API first (works on mobile for WhatsApp)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Informe Rival — ${rivalName}`,
          text: `📋 Informe del rival ${rivalName} (J${jornada}) — ${teamName}\n🔍 Generat amb NeoScout`,
          files: [file],
        })
      } else {
        // Fallback: download + open WhatsApp with text
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)

        // Open WhatsApp with message
        const waText = encodeURIComponent(
          `📋 Informe del rival *${rivalName}* (J${jornada})\n🏟️ ${teamName}\n🔍 Generat amb NeoScout\n\n👆 Adjunto l'informe PDF`
        )
        window.open(`https://wa.me/?text=${waText}`, '_blank')
      }
    } finally {
      setSharing(false)
    }
  }, [generatePdf, rivalName, teamName, jornada])

  return (
    <div>
      {/* Capturable content */}
      <div ref={contentRef}>{children}</div>

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {/* WhatsApp share */}
        <button
          onClick={handleShare}
          disabled={sharing || exporting}
          className="group flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3 rounded-full shadow-lg shadow-green-500/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          {sharing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          )}
          <span className="text-sm font-bold hidden sm:inline">
            {sharing ? 'Generant...' : 'Compartir'}
          </span>
        </button>

        {/* PDF download */}
        <button
          onClick={handleExport}
          disabled={exporting || sharing}
          className="group flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-3 rounded-full shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          {exporting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Download size={20} />
          )}
          <span className="text-sm font-bold hidden sm:inline">
            {exporting ? 'Generant PDF...' : 'Descarregar PDF'}
          </span>
        </button>
      </div>
    </div>
  )
}
