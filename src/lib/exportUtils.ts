import { CompanyInsights } from '@/components/CompanyInsightsDisplay';

export const exportReportToPDF = async (
    insights: CompanyInsights | null,
    competitors: any[],
    dimensionLabels: Record<string, string>
) => {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
    ]);

    // 1. Get all sections we want to print
    // The .pdf-section class was added to standard logical blocks in Index.tsx and components
    const sections = Array.from(document.querySelectorAll('.pdf-section')) as HTMLElement[];

    if (sections.length === 0) {
        console.warn('No .pdf-section elements found to export.');
        return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm margin
    const contentWidth = pdfPageWidth - (margin * 2);

    let currentY = margin;

    try {
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];

            // Capture each section as PNG via html2canvas (already in dependencies)
            const canvas = await html2canvas(section, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const dataUrl = canvas.toDataURL('image/png', 1.0);

            const imgProps = pdf.getImageProperties(dataUrl);
            const sectionHeight = (imgProps.height * contentWidth) / imgProps.width;

            // Check if we need to move to next page
            // If it fits, we add it. If not, new page.
            if (currentY + sectionHeight > (pdfPageHeight - margin)) {
                // Check if the section is larger than a FULL page. 
                // If so, we are forced to print it starting on a new page (and it will overlap/crop).
                // But generally our sections are smaller.

                pdf.addPage();
                currentY = margin;
            }

            pdf.addImage(dataUrl, 'PNG', margin, currentY, contentWidth, sectionHeight);
            currentY += sectionHeight + 5; // Add 5mm gap between sections
        }

        const fileName = competitors[0]?.name ? `${competitors[0].name}_Brand_Radar_Report.pdf` : 'Brand_Radar_Report.pdf';
        pdf.save(fileName);

    } catch (error) {
        console.error('PDF Export Error:', error);
        throw error;
    }
};
