const steps = [
  {
    number: "01",
    title: "Design Your TP",
    description:
      "Create practical exercises using our intuitive editor. Define objectives, constraints, and evaluation criteria.",
  },
  {
    number: "02",
    title: "AI Agents Activate",
    description:
      "Intelligent agents are assigned to each student, providing personalized guidance throughout the session.",
  },
  {
    number: "03",
    title: "Students Work & Learn",
    description:
      "Students complete exercises in an interactive environment with real-time AI feedback and hints.",
  },
  {
    number: "04",
    title: "Review & Improve",
    description:
      "Get detailed analytics on student performance, common struggles, and actionable insights to improve your curriculum.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#1a1a2e]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#89b4fa] uppercase tracking-wider mb-3">
            How It Works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple for Educators,{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#cba6f7] to-[#89b4fa]">
              Powerful for Students
            </span>
          </h2>
        </div>

        <div className="space-y-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`flex flex-col md:flex-row items-center gap-8 ${
                index % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-[#0f3460] flex items-center justify-center border border-white/10">
                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#cba6f7] to-[#89b4fa]">
                  {step.number}
                </span>
              </div>
              <div className={`flex-1 ${index % 2 === 1 ? "md:text-right" : ""}`}>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-white/70 text-lg leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
