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

    const reportContainer = document.getElementById('report-container') as HTMLElement | null;
    const firstSection = document.querySelector('.pdf-section') as HTMLElement | null;
    const target = reportContainer || firstSection;

    if (!target) {
        console.warn('No exportable report container found.');
        return;
    }

    try {
        const scale = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
        const canvas = await html2canvas(target, {
            scale,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: -window.scrollY,
            windowWidth: Math.max(document.documentElement.clientWidth, target.scrollWidth),
            windowHeight: Math.max(document.documentElement.clientHeight, target.scrollHeight),
        });

        const pdf = new jsPDF('p', 'mm', 'a4', true);
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const contentWidth = pdfPageWidth - (margin * 2);
        const contentHeight = pdfPageHeight - (margin * 2);

        // Convert canvas pixels to PDF mm for deterministic pagination.
        const pixelsPerMm = canvas.width / contentWidth;
        const pageSliceHeightPx = Math.max(1, Math.floor(contentHeight * pixelsPerMm));

        let offsetPx = 0;
        let pageIndex = 0;

        while (offsetPx < canvas.height) {
            const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - offsetPx);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeightPx;

            const pageContext = pageCanvas.getContext('2d');
            if (!pageContext) {
                throw new Error('Failed to create export canvas context.');
            }

            pageContext.drawImage(
                canvas,
                0,
                offsetPx,
                canvas.width,
                sliceHeightPx,
                0,
                0,
                canvas.width,
                sliceHeightPx
            );

            if (pageIndex > 0) {
                pdf.addPage();
            }

            const renderHeightMm = sliceHeightPx / pixelsPerMm;
            const imageData = pageCanvas.toDataURL('image/jpeg', 0.82);
            pdf.addImage(imageData, 'JPEG', margin, margin, contentWidth, renderHeightMm, undefined, 'FAST');

            offsetPx += sliceHeightPx;
            pageIndex += 1;
        }

        const fileName = competitors[0]?.name ? `${competitors[0].name}_Brand_Radar_Report.pdf` : 'Brand_Radar_Report.pdf';
        pdf.save(fileName);
    } catch (error) {
        console.error('PDF Export Error:', error);
        throw error;
    }
};
