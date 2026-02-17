import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import { Briefcase, GraduationCap, Wrench, Mail } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-12">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "About" }]} />
        <div className="animate-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Manohar Boinapally
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mb-1">
              <span className="text-foreground font-medium">He/Him</span>
            </p>
            <p className="text-sm sm:text-base text-foreground">
              Full-Stack Developer | Associate Software Engineer @ <span className="text-primary font-medium">OSI Digital</span> | AWS Certified | BE OU'24
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              📍 Khammam, Telangana, India
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4 text-foreground text-sm sm:text-base leading-relaxed">
            <p>
              I'm a passionate full-stack developer with 1.9+ years of experience building
              scalable web applications and cloud-based solutions. I specialize in creating
              efficient backend systems, responsive frontend interfaces, and containerized deployments.
            </p>
            <p>
              Currently working at <span className="text-primary font-medium">OSI Digital</span> as an Associate Software Engineer,
              where I focus on building robust applications using React, Node.js, and cloud technologies.
              I'm AWS certified and deeply interested in distributed systems, API design, and modern DevOps practices.
            </p>
            <p>
              I believe great software comes from understanding both the business needs and technical excellence.
              When I'm not coding, I'm learning new technologies and sharing knowledge through technical writing.
            </p>
          </div>

          {/* Experience */}
          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
              Experience
            </h2>
            <div className="space-y-6 sm:space-y-8">
              {[
                {
                  role: "Associate Software Engineer",
                  company: "OSI Digital",
                  period: "Jan 2025 — Present",
                  type: "Full-time · 1 yr 2 mos",
                  description:
                    "Building production-grade applications and managing deployment infrastructure. Working with React, Docker, and cloud technologies to deliver scalable solutions.",
                  skills: ["Docker", "React.js", "TypeScript", "AWS"]
                },
                {
                  role: "Project Associate Trainee",
                  company: "OSI Digital",
                  period: "Jun 2024 — Jan 2025",
                  type: "Full-time · 8 mos",
                  description:
                    "Developed full-stack applications with React and Node.js. Implemented responsive UI designs and optimized backend APIs for performance.",
                  skills: ["React.js", "Tailwind CSS", "Node.js", "MongoDB", "TypeScript", "FastAPI"]
                },
                {
                  role: "Intern",
                  company: "OSI Digital",
                  period: "Jan 2024 — Apr 2024",
                  type: "Internship · 4 mos",
                  description:
                    "Learned core software engineering principles. Built REST APIs with FastAPI, practiced OOP concepts, and worked on algorithmic challenges.",
                  skills: ["FastAPI", "Python", "OOP", "SQL", "Git"]
                },
              ].map((job, i) => (
                <div
                  key={i}
                  className="relative pl-5 border-l border-border animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="absolute left-[-3px] top-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  <p className="text-xs font-mono text-primary mb-1.5 font-medium">{job.period}</p>
                  <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">
                    {job.role}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    @ {job.company} <span className="text-xs font-normal">· {job.type}</span>
                  </p>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed mb-3">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <span key={skill} className="text-xs px-2.5 py-1 rounded-full bg-secondary/70 text-secondary-foreground font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              Education
            </h2>
            <div className="space-y-4 sm:space-y-6">
              {[
                {
                  degree: "Bachelor of Engineering",
                  field: "Electronics and Communications Engineering",
                  school: "Osmania University, Hyderabad",
                  period: "Jul 2020 — Jul 2024",
                  location: "Hyderabad, Telangana, India"
                },
                {
                  degree: "Intermediate (12th)",
                  field: "MPC (Mathematics, Physics, Chemistry)",
                  school: "Krishnaveni Co-operative Junior College",
                  period: "Jun 2018 — Jul 2020",
                  location: "Hyderabad, Telangana, India"
                }
              ].map((edu, i) => (
                <div key={i} className="border-l border-border pl-5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {edu.degree}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{edu.field}</p>
                  <p className="text-xs sm:text-sm text-foreground mt-1">{edu.school}</p>
                  <p className="text-xs text-muted-foreground mt-2">{edu.period}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
              <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
              Skills & Technologies
            </h2>
            
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {["TypeScript", "JavaScript", "Python", "C++", "C", "SQL"].map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Frontend</h3>
                <div className="flex flex-wrap gap-2">
                  {["React.js", "Tailwind CSS", "HTML", "CSS", "JavaScript"].map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Backend & APIs</h3>
                <div className="flex flex-wrap gap-2">
                  {["Node.js", "FastAPI", "REST APIs", "LangChain"].map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Databases & Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {["MongoDB", "PostgreSQL", "Redis", "Docker", "Git", "Shell Scripting"].map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Cloud & DevOps</h3>
                <div className="flex flex-wrap gap-2">
                  {["Amazon Web Services (AWS)", "Docker"].map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent font-medium border border-accent/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Core Concepts</h3>
                <div className="flex flex-wrap gap-2">
                  {["Object-Oriented Programming (OOP)", "Data Structures", "Algorithms"].map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-8 sm:mt-12 p-4 sm:p-6 rounded-lg border border-border/50 bg-card/50">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Get in touch
            </h2>
            <p className="text-muted-foreground text-sm mb-4">
              Open to collaborations, project opportunities, or just a friendly chat about tech!
            </p>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <a 
                href="mailto:manohar.boinapally@gmail.com" 
                className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
              >
                Email
              </a>
              <a 
                href="https://github.com/Manoo07" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
              >
                GitHub
              </a>
              <a 
                href="https://linkedin.com/in/manohar-boinapally" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
