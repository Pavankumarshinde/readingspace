import { MoreVertical, Plus, BookOpen, Calculator, Lightbulb, Languages } from 'lucide-react'

export default function StudentNotes() {
  const notes = [
    {
      id: '1',
      title: 'The Architecture of Happiness',
      content: '"We are drawn to call something beautiful when we find in it the concentration of those qualities we are lacking in our own lives." A profound thought for the library design project.',
      date: 'TODAY, 10:45 AM',
      tags: ['PHILOSOPHY', 'ROOM 402'],
      icon: <BookOpen size={18} className="text-[var(--teal)]" />
    },
    {
      id: '2',
      title: 'Research Paper: Structural Integrity',
      content: 'Need to cross-reference the tensile strength data with the Eurocode 3 standards before the submission tomorrow. Check Appendix B.',
      date: 'YESTERDAY, 4:12 PM',
      tags: ['ENGINEERING'],
      icon: <Calculator size={18} className="text-[var(--navy)] fill-[var(--navy)]" />
    },
    {
      id: '3',
      title: 'Idea for Thesis',
      content: 'What if the library was organized not by Dewey Decimal, but by the emotional response of the books? Exploring the psychology of categorization.',
      date: 'OCT 22, 11:30 AM',
      tags: ['PERSONAL', 'CREATIVE'],
      icon: <Lightbulb size={18} className="text-[#EA8C00] fill-[#EA8C00]" />
    },
    {
      id: '4',
      title: 'Vocabulary Log',
      content: '1. Palimpsest: something reused or altered but still bearing visible traces of its earlier form. 2. Mellifluous: sweet or musical; pleasant to hear.',
      date: 'OCT 20, 9:15 AM',
      tags: ['LANGUAGE'],
      icon: <Languages size={18} className="text-[var(--teal)]" />
    }
  ]

  return (
    <div className="flex flex-col gap-6 p-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[var(--navy)]">My Notes</h1>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Capture your thoughts, citations, and reflections during your reading sessions.
        </p>
      </header>

      {/* Search area removed */}

      <div className="flex flex-col gap-4">
        {notes.map((note) => (
          <div key={note.id} className="card p-5 relative overflow-hidden border-l-4 border-l-[var(--teal)]">
            <div className="flex-between mb-3">
               <div className="flex items-center gap-2">
                  {note.icon}
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{note.date}</span>
               </div>
               <button className="btn-ghost p-1"><MoreVertical size={18}/></button>
            </div>
            
            <h2 className="text-[18px] font-bold text-[var(--navy)] mb-2">{note.title}</h2>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">
              {note.content}
            </p>

            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span key={tag} className="bg-[var(--surface-2)] text-[var(--text-muted)] text-[10px] font-bold py-1 px-2.5 rounded-full border border-[var(--border)] tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="fab">
         <Plus size={24} />
      </button>
    </div>
  )
}
