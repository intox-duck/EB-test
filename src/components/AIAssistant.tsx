import { useState, useRef, useEffect } from "react";
import {
    MessageCircle,
    Send,
    X,
    User,
    Bot,
    Loader2,
    Sparkles,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface AIAssistantProps {
    context: any;
}

export const AIAssistant = ({ context }: AIAssistantProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: `Hello! I'm your Talent Intelligence Assistant. I've analysed the data for ${context?.companyName || "the current comparison"}. How can I help you understand these insights today?`
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: input,
                    context: context
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting to my intelligence base right now. Please try again." }]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: "assistant", content: "An error occurred while processing your request." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground z-50 animate-bounce"
                >
                    <MessageCircle className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l border-slate-300">
                <SheetHeader className="p-4 border-b border-slate-300 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle>Talent Intelligence Assistant</SheetTitle>
                            <SheetDescription className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                <Sparkles className="w-3 h-3 text-primary" />
                                Chapter 2 Talent Intelligence Engine
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                )}>
                                    {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm leading-relaxed overflow-hidden prose prose-sm max-w-none break-words",
                                    m.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-tr-none prose-invert"
                                        : "bg-muted text-foreground rounded-tl-none border border-slate-200 prose-zinc"
                                )}>
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                            ul: ({ children }) => <ul className="pl-4 mb-2 list-disc">{children}</ul>,
                                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                                            h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                                            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                        }}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 mr-auto">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-none border border-slate-200">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-slate-300 bg-background">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex gap-2"
                    >
                        <Input
                            placeholder="Ask about the tech stack, score breakdown..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1"
                            disabled={isLoading}
                        />
                        <Button size="icon" disabled={!input.trim() || isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </form>
                    <p className="text-[10px] text-center text-muted-foreground mt-2">
                        AI can make mistakes. Verify important information.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
};
