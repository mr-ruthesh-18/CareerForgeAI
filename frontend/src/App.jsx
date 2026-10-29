
import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users
} from 'lucide-react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, token = '', options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })

  const data = response.status === 204
    ? null
    : await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : `Request failed (${response.status})`
    )
  }

  return data
}

const initialForm = {
  name: '',
  email: '',
  password: '',
  department: ''
}

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('cf_token') || ''
  )
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [skillsText, setSkillsText] = useState('')
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [summary, setSummary] = useState(null)
  const [adminApps, setAdminApps] = useState([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [jobForm, setJobForm] = useState({
    title: '',
    company: 'ApexRise',
    description: '',
    required_skills: 'Python, SQL',
    location: 'Remote',
    job_type: 'Internship'
  })

  function flash(message, isError = false) {
    setNotice(isError ? '' : message)
    setError(isError ? message : '')
  }

  async function loadDashboard(currentToken = token) {
    const me = await request('/api/auth/me', currentToken)
    setUser(me)
    setSkillsText((me.skills || []).join(', '))

    const allJobs = await request('/api/jobs', currentToken)
    setJobs(allJobs)

    if (me.role === 'admin') {
      const [adminSummary, allApplications] = await Promise.all([
        request('/api/admin/summary', currentToken),
        request('/api/admin/applications', currentToken)
      ])
      setSummary(adminSummary)
      setAdminApps(allApplications)
      setApplications([])
    } else {
      const myApplications = await request(
        '/api/applications/me',
        currentToken
      )
      setApplications(myApplications)
      setSummary(null)
      setAdminApps([])
    }

    return me
  }

  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function restoreSession() {
      try {
        const me = await request('/api/auth/me', token)
        if (cancelled) return

        setUser(me)
        await loadDashboard(token)
      } catch (e) {
        if (cancelled) return
        localStorage.removeItem('cf_token')
        setToken('')
        setUser(null)
        flash(e.message || 'Session expired. Please sign in again.', true)
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  async function submitAuth(e) {
    e.preventDefault()
    setBusy(true)
    flash('')

    try {
      const email = form.email.trim().toLowerCase()
      const payload = mode === 'register'
        ? {
            name: form.name.trim(),
            email,
            password: form.password,
            department: form.department.trim()
          }
        : {
            email,
            password: form.password
          }

      const endpoint = mode === 'register'
        ? '/api/auth/register'
        : '/api/auth/login'

      const data = await request(endpoint, '', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!data.access_token) {
        throw new Error('The server did not return an access token.')
      }

      localStorage.setItem('cf_token', data.access_token)
      setToken(data.access_token)

      await loadDashboard(data.access_token)
      setForm(initialForm)
      flash(`Welcome${data.user?.name ? `, ${data.user.name}` : ''}!`)
    } catch (e) {
      localStorage.removeItem('cf_token')
      setToken('')
      setUser(null)
      flash(e.message || 'Unable to sign in.', true)
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem('cf_token')
    setToken('')
    setUser(null)
    setJobs([])
    setApplications([])
    setSummary(null)
    setAdminApps([])
    setForm(initialForm)
    setMode('login')
    flash('You have signed out.')
  }

  async function saveSkills() {
    try {
      const data = await request('/api/students/me/skills', token, {
        method: 'PUT',
        body: JSON.stringify({
          skills: skillsText.split(',').map(s => s.trim()).filter(Boolean)
        })
      })

      setUser(data)
      setSkillsText(data.skills.join(', '))
      await loadDashboard()
      flash('Skills updated. Match scores recalculated.')
    } catch (e) {
      flash(e.message, true)
    }
  }

  async function apply(jobId) {
    try {
      await request(`/api/jobs/${jobId}/apply`, token, {
        method: 'POST',
        body: JSON.stringify({})
      })

      await loadDashboard()
      flash('Application submitted successfully.')
    } catch (e) {
      flash(e.message, true)
    }
  }

  async function createJob(e) {
    e.preventDefault()

    try {
      const payload = {
        ...jobForm,
        required_skills: jobForm.required_skills
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      }

      await request('/api/jobs', token, {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setJobForm({
        title: '',
        company: 'ApexRise',
        description: '',
        required_skills: 'Python, SQL',
        location: 'Remote',
        job_type: 'Internship'
      })

      await loadDashboard()
      flash('Job listing created.')
    } catch (e) {
      flash(e.message, true)
    }
  }

  async function updateStatus(id, statusValue) {
    try {
      await request(
        `/api/admin/applications/${id}?status_value=${encodeURIComponent(statusValue)}`,
        token,
        { method: 'PATCH' }
      )

      await loadDashboard()
      flash('Application status updated.')
    } catch (e) {
      flash(e.message, true)
    }
  }

  const appliedIds = useMemo(
    () => new Set(applications.map(a => a.job_id)),
    [applications]
  )

  const filteredJobs = jobs.filter(job =>
    `${job.title} ${job.company} ${(job.required_skills || []).join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )

  if (!user) {
    return (
      <main className="auth-shell">
        <div className="auth-art">
          <div className="brand">
            <span className="brand-mark">CF</span>
            <span>CareerForge <b>AI</b></span>
          </div>

          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={15} /> APEXRISE CAREER LAB
            </span>
            <h1>Your next opportunity starts with <em>readiness.</em></h1>
            <p>
              Build skills, discover roles, and track your placement journey
              in one place.
            </p>

            <div className="mini-stat">
              <div><strong>01</strong><span>Know your skills</span></div>
              <div><strong>02</strong><span>Find matching roles</span></div>
              <div><strong>03</strong><span>Track applications</span></div>
            </div>
          </div>

          <div className="art-footer">
            Grow Yourself. Grow India. <span>APEXRISE</span>
          </div>
        </div>

        <section className="auth-panel">
          <form className="auth-card" onSubmit={submitAuth}>
            <span className="eyebrow">STUDENT CAREER PORTAL</span>
            <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="muted">
              {mode === 'login'
                ? 'Sign in to continue your career journey.'
                : 'Create a student account to get started.'}
            </p>

            {mode === 'register' && (
              <>
                <label>
                  Full name
                  <input
                    required
                    minLength="2"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                  />
                </label>

                <label>
                  Department
                  <input
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    placeholder="e.g. CSE"
                  />
                </label>
              </>
            )}

            <label>
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </label>

            <label>
              Password
              <input
                required
                minLength="8"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </label>

            {error && <div className="alert error">{error}</div>}
            {notice && <div className="alert">{notice}</div>}

            <button className="primary full" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>

            <p className="switch">
              {mode === 'login' ? 'New to CareerForge?' : 'Already registered?'}{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setForm(initialForm)
                  flash('')
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>

            <p className="fine-print">Demo project · Use synthetic data only</p>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CF</span>
          <span>CareerForge <b>AI</b></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="nav-item active">
          <LayoutDashboard size={17} /> Dashboard
        </div>
        <div className="nav-item">
          <BriefcaseBusiness size={17} /> Opportunities
        </div>
        <div className="nav-item">
          <GraduationCap size={17} /> Skill readiness
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">
            {(user.name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-text">
            <strong>{user.name}</strong>
            <span>{user.role === 'admin' ? 'Administrator' : user.department || 'Student account'}</span>
          </div>
          <button className="icon-btn" onClick={logout} title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">APEXRISE / CAREER LAB</span>
            <h1>Dashboard</h1>
          </div>

          <div className="top-actions">
            <span className="live-dot">Demo workspace</span>
            <button
              className="outline small"
              onClick={() =>
                loadDashboard()
                  .then(() => flash('Dashboard refreshed'))
                  .catch(e => flash(e.message, true))
              }
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert">{notice}</div>}

        <section className="welcome-card">
          <div>
            <span className="eyebrow light">YOUR CAREER JOURNEY</span>
            <h2>Hello, {user.name.split(' ')[0]} <span>✦</span></h2>
            <p>Small steps today can open bigger opportunities tomorrow.</p>
          </div>
          <div className="welcome-icon"><GraduationCap size={35} /></div>
        </section>

        {user.role === 'admin' && summary && (
          <div className="stats-grid">
            <Stat icon={<Users />} label="Students" value={summary.students} />
            <Stat icon={<BriefcaseBusiness />} label="Active jobs" value={summary.jobs} />
            <Stat icon={<LayoutDashboard />} label="Applications" value={summary.applications} />
          </div>
        )}

        {user.role === 'student' && (
          <section className="panel skills-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">PROFILE</span>
                <h3>Skills & readiness</h3>
              </div>
              <span className="score-chip">{user.skills.length} skills added</span>
            </div>

            <p className="muted">
              Add skills separated by commas. Scores compare your skills with
              each listing's required skills; they are guidance, not hiring predictions.
            </p>

            <div className="skill-edit">
              <input
                value={skillsText}
                onChange={e => setSkillsText(e.target.value)}
                placeholder="Python, SQL, React, FastAPI"
              />
              <button className="primary" onClick={saveSkills}>Save skills</button>
            </div>
          </section>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE</span>
              <h2>{user.role === 'admin' ? 'Manage opportunities' : 'Recommended opportunities'}</h2>
            </div>

            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search jobs or skills"
              />
            </div>
          </div>

          {user.role === 'admin' && (
            <form className="panel job-create" onSubmit={createJob}>
              <h3><Plus size={18} /> Add a job listing</h3>

              <div className="form-grid">
                <label>
                  Role title
                  <input
                    required
                    value={jobForm.title}
                    onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
                    placeholder="Python Developer Intern"
                  />
                </label>

                <label>
                  Company
                  <input
                    required
                    value={jobForm.company}
                    onChange={e => setJobForm({ ...jobForm, company: e.target.value })}
                  />
                </label>

                <label>
                  Location
                  <input
                    value={jobForm.location}
                    onChange={e => setJobForm({ ...jobForm, location: e.target.value })}
                  />
                </label>

                <label>
                  Type
                  <input
                    value={jobForm.job_type}
                    onChange={e => setJobForm({ ...jobForm, job_type: e.target.value })}
                  />
                </label>

                <label className="span-2">
                  Required skills
                  <input
                    value={jobForm.required_skills}
                    onChange={e => setJobForm({ ...jobForm, required_skills: e.target.value })}
                    placeholder="Python, SQL, FastAPI"
                  />
                </label>

                <label className="span-2">
                  Description
                  <textarea
                    required
                    minLength="10"
                    value={jobForm.description}
                    onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Describe responsibilities and expectations"
                  />
                </label>
              </div>

              <button className="primary">
                <Plus size={16} /> Publish listing
              </button>
            </form>
          )}

          <div className="jobs-grid">
            {filteredJobs.map(job => (
              <article className="job-card" key={job.id}>
                <div className="job-top">
                  <div className="company-icon">
                    {(job.company || 'C').slice(0, 1).toUpperCase()}
                  </div>
                  <span className="job-type">{job.job_type}</span>
                </div>

                <h3>{job.title}</h3>
                <p className="company-name">{job.company} · {job.location}</p>
                <p className="job-description">{job.description}</p>

                <div className="skill-tags">
                  {(job.required_skills || []).map(skill => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>

                <div className="job-footer">
                  <div className="match">
                    <div
                      className="match-ring"
                      style={{ '--score': `${job.match_score}%` }}
                    >
                      <span>{job.match_score}</span>
                    </div>
                    <div>
                      <strong>Skill match</strong>
                      <small>Based on your profile</small>
                    </div>
                  </div>

                  {user.role === 'student' ? (
                    <button
                      className={appliedIds.has(job.id) ? 'outline small' : 'primary small'}
                      disabled={appliedIds.has(job.id)}
                      onClick={() => apply(job.id)}
                    >
                      {appliedIds.has(job.id) ? 'Applied' : 'Apply now'}
                    </button>
                  ) : (
                    <span className="admin-label">Admin view</span>
                  )}
                </div>
              </article>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="empty">No listings match your search.</div>
          )}
        </section>

        {user.role === 'student' ? (
          <section className="panel application-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">YOUR ACTIVITY</span>
                <h3>Recent applications</h3>
              </div>
              <span className="score-chip">{applications.length} total</span>
            </div>

            {applications.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Company</th>
                      <th>Match</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(a => (
                      <tr key={a.id}>
                        <td>{a.job_title}</td>
                        <td>{a.company}</td>
                        <td>{a.match_score}%</td>
                        <td><span className="status">{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">You haven't applied to any opportunities yet.</p>
            )}
          </section>
        ) : (
          <section className="panel application-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">ADMIN WORKSPACE</span>
                <h3>Candidate applications</h3>
              </div>
              <span className="score-chip">{adminApps.length} records</span>
            </div>

            {adminApps.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Update status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminApps.map(a => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.student_name}</strong>
                          <small className="table-sub">{a.student_email}</small>
                        </td>
                        <td>
                          {a.job_title}
                          <small className="table-sub">{a.company}</small>
                        </td>
                        <td><span className="status">{a.status}</span></td>
                        <td>
                          <select
                            value={a.status}
                            onChange={e => updateStatus(a.id, e.target.value)}
                          >
                            {['Applied', 'Under Review', 'Shortlisted', 'Rejected'].map(s => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Applications submitted by students will appear here.</p>
            )}
          </section>
        )}

        <footer className="footer">
          CareerForge AI <span>·</span> A student placement-readiness demo by
          <strong>ApexRise</strong> <span>·</span> Grow Yourself. Grow India.
        </footer>
      </main>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Current workspace</small>
    </div>
  )
}
