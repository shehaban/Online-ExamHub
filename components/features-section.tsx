import { Shield, Zap, Brain, Users, BarChart3, Clock } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI-Powered Generation",
    description: "Upload course materials and let AI create comprehensive exams automatically. Save hours of preparation time.",
  },
  {
    icon: Zap,
    title: "Instant Grading",
    description: "Get results immediately after submission. Automatic grading for multiple choice, true/false, and more.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track student progress with detailed dashboards. Identify strengths and areas for improvement.",
  },
  {
    icon: Shield,
    title: "Secure Testing",
    description: "Anti-cheating measures including randomized questions, time limits, and browser lockdown options.",
  },
  {
    icon: Users,
    title: "Collaboration Space",
    description: "Discussion forums for each exam. Students can ask questions, instructors can provide guidance.",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Set availability windows, time limits, and multiple attempts. Exams adapt to your schedule.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-16 lg:py-24 border-t border-border">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Everything you need for online exams
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A complete platform for creating, managing, and taking exams with powerful features for both instructors and students.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group relative p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {feature.title}
            </h3>
            <p className="text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
