import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit,
  FileText,
  Target,
  Star,
  CheckCircle,
  RefreshCw,
  Download,
  BarChart3,
  HelpCircle,
  Lightbulb
} from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";

// --- MODIFICATION: Updated Question interface (no change here, but for context) ---
interface Question {
  id: string;
  question: string;
  category: string;
  modelAnswer: string;
  interviewerIntent: string;
  userAnswer?: string;
  score?: number;
  feedback?: string;
  isAnswered: boolean;
}

// --- MODIFICATION: Updated JobAnalysis interface to include explanation for questions ---
interface JobAnalysis {
  jobTitle: string;
  company: string;
  keySkills: string[];
  requirements: string[];
  questions: Question[];
  questionsToAskInterviewer: {
    question: string;
    goodImpression: string;
  }[];
}


// --- MODIFICATION: Updated QuestionsToAskCard to display the good impression explanation ---
const QuestionsToAskCard = ({ questions }: { questions: { question: string; goodImpression: string }[] }) => {
  if (!questions || questions.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>Your Questions for the Interviewer</span>
        </CardTitle>
        <div className="text-sm text-gray-600 pt-2 space-y-2">
          <p>
            An interview is a two-way conversation. Asking smart, relevant questions shows your engagement and helps you evaluate if the company and role are the right fit for your career goals.
          </p>
          <p className="font-semibold">
            Use these AI-generated suggestions as a starting point.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4 list-disc list-inside text-gray-700">
          {questions.map((item, index) => (
            <li key={index}>
              {item.question}
              <div className="ml-[1.4rem] mt-2 p-3 bg-gray-50 rounded-md border text-sm text-gray-600">
                <p><span className="font-semibold">Good Impression:</span> {item.goodImpression}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};


export default function InterviewPreparation() {
  const [step, setStep] = useState<"input" | "questions" | "practice" | "results">("input");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [interviewType, setInterviewType] = useState("mixed");
  const [interviewerRole, setInterviewerRole] = useState("hiring_manager");
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [isScoring, setIsScoring] = useState(false);
  const user = useAuth()
  const { toast } = useToast();

  const generateQuestions = async () => {
    if (!jobDescription.trim() && !jobTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide either a job description or job title to generate questions.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-interview-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          jobTitle,
          interviewType,
          interviewerRole,
          id: user?.user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
      }

      const analysis = await response.json();
      setJobAnalysis(analysis);
      setStep("questions");

      toast({
        title: "Questions Generated!",
        description: `Generated ${analysis.questions.length} tailored interview questions.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startPractice = () => {
    setStep("practice");
    setCurrentQuestionIndex(0);
  };

  const submitAnswer = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const scoreAnswers = async () => {
    if (!jobAnalysis) return;
    setIsScoring(true);
    try {
      const response = await fetch('/api/score-interview-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: jobAnalysis.questions,
          userAnswers,
          jobTitle: jobAnalysis.jobTitle
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to score answers');
      }

      const scoredQuestions = await response.json();
      setJobAnalysis(prev => prev ? {
        ...prev,
        questions: scoredQuestions.questions
      } : null);

      setStep("results");

      toast({
        title: "Scoring Complete!",
        description: "Your interview answers have been evaluated with personalized feedback.",
      });
    } catch (error) {
      toast({
        title: "Scoring Failed",
        description: "Unable to score answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const restartSession = () => {
    setStep("input");
    setJobDescription("");
    setJobTitle("");
    setJobAnalysis(null);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <GlobalHeader />
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-b bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            AI Interview Question Generator & Scorer
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Get personalized interview questions based on job descriptions and receive AI-powered scoring with detailed feedback.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <BrainCircuit className="w-3 h-3 mr-1" />
              AI-Generated Questions
            </Badge>
            <Badge variant="secondary" className="bg-pink-100 text-pink-800">
              <BarChart3 className="w-3 h-3 mr-1" />
              Intelligent Scoring
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Target className="w-3 h-3 mr-1" />
              Personalized Feedback
            </Badge>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === "input" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Step 1: Job Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Job Title (Optional)</label>
                <Input
                  placeholder="e.g., Senior Software Engineer, Marketing Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Job Description or LinkedIn Job Link</label>
                <Textarea
                  placeholder="Paste the full job description here or provide a LinkedIn job link..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  className="min-h-[200px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Interview Type</label>
                  <Select value={interviewType} onValueChange={setInterviewType}>
                    <SelectTrigger><SelectValue placeholder="Select interview type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="managerial">Managerial</SelectItem>
                      <SelectItem value="mixed">Mixed (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Interview With</label>
                  <Select value={interviewerRole} onValueChange={setInterviewerRole}>
                    <SelectTrigger><SelectValue placeholder="Select interviewer's role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                      <SelectItem value="hr_recruiter">HR / Recruiter</SelectItem>
                      <SelectItem value="technical_lead">Technical Lead / Senior Engineer</SelectItem>
                      <SelectItem value="team_member">Peer / Team Member</SelectItem>
                      <SelectItem value="executive">Executive / C-Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={generateQuestions}
                disabled={isGenerating || (!jobDescription.trim() && !jobTitle.trim())}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isGenerating ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating Questions...</>) : (<><BrainCircuit className="w-4 h-4 mr-2" />Generate Interview Questions</>)}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "questions" && jobAnalysis && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span>Generated Questions for: {jobAnalysis.jobTitle}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-2">Review the questions you might be asked, then start your practice session.</p>
                  </div>
                  <Button onClick={startPractice} className="bg-gradient-to-r from-green-500 to-blue-600">Start Practice</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jobAnalysis.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">Question {index + 1}</h3>
                        <Badge variant="outline" className="text-xs">{question.category}</Badge>
                      </div>
                      <p className="text-gray-700">{question.question}</p>

                      {question.interviewerIntent && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex items-center text-sm font-semibold text-gray-600 mb-1">
                            <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                            <span>Why they're asking this</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {question.interviewerIntent}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <QuestionsToAskCard questions={jobAnalysis.questionsToAskInterviewer} />
          </div>
        )}

        {step === "practice" && jobAnalysis && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Question {currentQuestionIndex + 1} of {jobAnalysis.questions.length}</CardTitle>
                  <Badge variant="outline">{jobAnalysis.questions[currentQuestionIndex]?.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-900 text-lg">{jobAnalysis.questions[currentQuestionIndex]?.question}</p>
                </div>

                {jobAnalysis.questions[currentQuestionIndex]?.interviewerIntent && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="flex items-center font-semibold text-gray-700 mb-2">
                      <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                      <span>Keep in mind why they're asking</span>
                    </h4>
                    <p className="text-gray-600">
                      {jobAnalysis.questions[currentQuestionIndex]?.interviewerIntent}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Your Answer</label>
                  <Textarea
                    placeholder="Type your answer here..."
                    value={userAnswers[jobAnalysis.questions[currentQuestionIndex]?.id] || ""}
                    onChange={(e) => submitAnswer(jobAnalysis.questions[currentQuestionIndex]?.id, e.target.value)}
                    rows={6}
                    className="min-h-[150px]"
                  />
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0}>Previous</Button>
                  {currentQuestionIndex < jobAnalysis.questions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)} className="bg-gradient-to-r from-blue-500 to-purple-600">Next Question</Button>
                  ) : (
                    <Button onClick={scoreAnswers} disabled={isScoring} className="bg-gradient-to-r from-green-500 to-blue-600">
                      {isScoring ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Scoring...</>) : (<><BarChart3 className="w-4 h-4 mr-2" />Score My Answers</>)}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <QuestionsToAskCard questions={jobAnalysis.questionsToAskInterviewer} />
          </div>
        )}

        {step === "results" && jobAnalysis && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span>Interview Results</span>
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={restartSession}><RefreshCw className="w-4 h-4 mr-2" />Try Again</Button>
                    <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export PDF</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {jobAnalysis.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-gray-900">Question {index + 1}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{question.category}</Badge>
                          {question.score && (
                            <Badge
                              className={
                                question.score >= 8
                                  ? "bg-green-100 text-green-800"
                                  : question.score >= 5
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              Score: {question.score}/10
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4">{question.question}</p>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Your Answer:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{userAnswers[question.id] || "No answer provided"}</p>
                      </div>
                      {question.feedback && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">AI Feedback:</h4>
                          <p className="text-blue-800 whitespace-pre-wrap">{question.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <QuestionsToAskCard questions={jobAnalysis.questionsToAskInterviewer} />
          </div>
        )}
      </div>
    </div>
  );
}