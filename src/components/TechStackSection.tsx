import { Card } from '@/components/ui/card';
import {
    Cpu,
    CheckCircle2
} from 'lucide-react';

interface TechStackSectionProps {
    title: string;
    items: string[]; // Changed to just strings for labels
}

export const TechStackSection = ({ title, items }: TechStackSectionProps) => {
    return (
        <Card className="p-6 gradient-card shadow-card border border-slate-300">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
                <Cpu className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
                {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 group transition-all duration-200">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-1 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                        <span className="text-sm font-medium text-foreground leading-snug">{item}</span>
                    </div>
                ))}
            </div>

            {items.length === 0 && (
                <div className="py-8 text-center text-muted-foreground italic">
                    Analysis in progress or no specific technology data extracted...
                </div>
            )}
        </Card>
    );
};
