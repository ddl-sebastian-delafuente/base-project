import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Col,
  DominoTable,
  Row,
  Space,
  SpinnerWrapper,
  Tag,
  Typography,
  type DominoColumnType,
} from '@dominodatalab/extensions-tools'

type Project = {
  id: string
  name: string
  owner: string
  description?: string
  visibility?: string
  created?: string
  mainRepository?: { uri?: string; name?: string }
  tags?: { name: string }[]
}

type Job = { id?: string; title?: string; command?: string; status?: { executionStatus?: string }; startedTime?: number }
type App = { id?: string; name?: string; status?: string; openUrl?: string; lastUpdated?: string; publisher?: { fullName?: string } }
type Workspace = { id?: string; name?: string; environmentId?: string; state?: string; createdTime?: number }
type Dataset = { id?: string; name?: string; datasetPath?: string; sizeInBytes?: number; lifecycleStatus?: string }
type ModelApi = { _id?: string; name?: string; description?: string; status?: string }
type RegisteredModel = { id?: string; name?: string; description?: string; ownerUsername?: string }
type ScheduledJob = { id?: string; title?: string; cronString?: string; scheduledByUserName?: string; isPaused?: boolean }
type Collaborator = { id?: string; fullName?: string; userName?: string; email?: string }
type Goal = { id?: string; title?: string; description?: string; isComplete?: boolean }

type Entities = {
  jobs: Job[]
  apps: App[]
  workspaces: Workspace[]
  datasets: Dataset[]
  modelApis: ModelApi[]
  registeredModels: RegisteredModel[]
  scheduledJobs: ScheduledJob[]
  collaborators: Collaborator[]
  goals: Goal[]
}

function formatBytes(n?: number): string {
  if (!n || n < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

function formatDate(value?: string | number): string {
  if (!value) return '—'
  const d = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type SectionProps<T> = {
  title: string
  rows: T[]
  columns: DominoColumnType<T>[]
  rowKey: (r: T) => string
  emptyText: string
}

function EntitySection<T>({ title, rows, columns, rowKey, emptyText }: SectionProps<T>) {
  return (
    <Card
      title={title}
      extra={<Tag type="user-generated">{rows.length}</Tag>}
      noPadding
    >
      <DominoTable<T>
        columns={columns}
        dataSource={rows}
        rowKey={rowKey}
        pagination={rows.length > 5 ? { pageSize: 5, showSizeChanger: false } : false}
        isFiltered={false}
        emptyStateConfig={{ description: emptyText, icon: 'Cube' }}
      />
    </Card>
  )
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [entities, setEntities] = useState<Entities | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const projectId = new URLSearchParams(window.location.search).get('projectId')
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    // Resolve API URLs relative to the current document so the Domino
    // /apps-internal/<appId>/ proxy prefix is preserved.
    const apiBase = window.location.pathname.replace(/[^/]*$/, '') + 'api'
    Promise.all([
      fetch(`${apiBase}/project${qs}`).then((r) => (r.ok ? r.json() : Promise.reject(r.statusText))),
      fetch(`${apiBase}/entities${qs}`).then((r) => (r.ok ? r.json() : Promise.reject(r.statusText))),
    ])
      .then(([p, e]) => {
        if (cancelled) return
        setProject(p)
        setEntities(e)
      })
      .catch((err) => {
        if (cancelled) return
        setError(typeof err === 'string' ? err : 'Failed to load project context')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sections = useMemo(() => {
    if (!entities) return []
    return [
      {
        title: 'Apps',
        rows: entities.apps,
        rowKey: (r: App) => r.id ?? r.name ?? Math.random().toString(),
        emptyText: 'No apps have been published in this project.',
        columns: [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 240, resizable: true },
          {
            title: 'Status',
            key: 'status',
            width: 120,
            render: (_: unknown, r: App) =>
              r.status ? <Tag type={r.status === 'Running' ? 'success' : 'user-generated'}>{r.status}</Tag> : '—',
          },
          { title: 'Publisher', key: 'publisher', width: 200, render: (_: unknown, r: App) => r.publisher?.fullName ?? '—' },
          { title: 'Updated', key: 'updated', width: 140, render: (_: unknown, r: App) => formatDate(r.lastUpdated) },
        ] as DominoColumnType<App>[],
      },
      {
        title: 'Workspaces',
        rows: entities.workspaces,
        rowKey: (r: Workspace) => r.id ?? r.name ?? Math.random().toString(),
        emptyText: 'No workspaces are recorded for this project.',
        columns: [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 260, resizable: true },
          {
            title: 'State',
            key: 'state',
            width: 140,
            render: (_: unknown, r: Workspace) => (r.state ? <Tag type="user-generated">{r.state}</Tag> : '—'),
          },
          { title: 'Created', key: 'created', width: 140, render: (_: unknown, r: Workspace) => formatDate(r.createdTime) },
        ] as DominoColumnType<Workspace>[],
      },
      {
        title: 'Jobs',
        rows: entities.jobs,
        rowKey: (r: Job) => r.id ?? Math.random().toString(),
        emptyText: 'No jobs have been run in this project yet.',
        columns: [
          {
            title: 'Title',
            key: 'title',
            width: 320,
            resizable: true,
            render: (_: unknown, r: Job) => r.title ?? r.command ?? '—',
          },
          {
            title: 'Status',
            key: 'status',
            width: 140,
            render: (_: unknown, r: Job) => {
              const s = r.status?.executionStatus
              if (!s) return '—'
              const type = s === 'Succeeded' ? 'success' : s === 'Failed' ? 'danger' : 'user-generated'
              return <Tag type={type}>{s}</Tag>
            },
          },
          { title: 'Started', key: 'started', width: 140, render: (_: unknown, r: Job) => formatDate(r.startedTime) },
        ] as DominoColumnType<Job>[],
      },
      {
        title: 'Scheduled jobs',
        rows: entities.scheduledJobs,
        rowKey: (r: ScheduledJob) => r.id ?? Math.random().toString(),
        emptyText: 'No scheduled jobs configured.',
        columns: [
          { title: 'Title', dataIndex: 'title', key: 'title', width: 260, resizable: true },
          { title: 'Cron', dataIndex: 'cronString', key: 'cron', width: 180 },
          { title: 'Owner', dataIndex: 'scheduledByUserName', key: 'owner', width: 160 },
          {
            title: 'State',
            key: 'state',
            width: 120,
            render: (_: unknown, r: ScheduledJob) => (
              <Tag type={r.isPaused ? 'warning' : 'success'}>{r.isPaused ? 'Paused' : 'Active'}</Tag>
            ),
          },
        ] as DominoColumnType<ScheduledJob>[],
      },
      {
        title: 'Datasets',
        rows: entities.datasets,
        rowKey: (r: Dataset) => r.id ?? r.name ?? Math.random().toString(),
        emptyText: 'No datasets are visible to this project.',
        columns: [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 200, resizable: true },
          { title: 'Path', dataIndex: 'datasetPath', key: 'path', width: 260, resizable: true },
          { title: 'Size', key: 'size', width: 100, render: (_: unknown, r: Dataset) => formatBytes(r.sizeInBytes) },
          {
            title: 'Status',
            key: 'status',
            width: 120,
            render: (_: unknown, r: Dataset) =>
              r.lifecycleStatus ? <Tag type={r.lifecycleStatus === 'Active' ? 'success' : 'user-generated'}>{r.lifecycleStatus}</Tag> : '—',
          },
        ] as DominoColumnType<Dataset>[],
      },
      {
        title: 'Model APIs',
        rows: entities.modelApis,
        rowKey: (r: ModelApi) => r._id ?? r.name ?? Math.random().toString(),
        emptyText: 'No Model APIs are published in this project.',
        columns: [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 240, resizable: true },
          { title: 'Description', dataIndex: 'description', key: 'description', width: 320, resizable: true },
          {
            title: 'Status',
            key: 'status',
            width: 120,
            render: (_: unknown, r: ModelApi) => (r.status ? <Tag type="user-generated">{r.status}</Tag> : '—'),
          },
        ] as DominoColumnType<ModelApi>[],
      },
      {
        title: 'Registered models',
        rows: entities.registeredModels,
        rowKey: (r: RegisteredModel) => r.id ?? r.name ?? Math.random().toString(),
        emptyText: 'No models registered in the model registry.',
        columns: [
          { title: 'Name', dataIndex: 'name', key: 'name', width: 240, resizable: true },
          { title: 'Description', dataIndex: 'description', key: 'description', width: 320, resizable: true },
          { title: 'Owner', dataIndex: 'ownerUsername', key: 'owner', width: 160 },
        ] as DominoColumnType<RegisteredModel>[],
      },
      {
        title: 'Collaborators',
        rows: entities.collaborators,
        rowKey: (r: Collaborator) => r.id ?? r.userName ?? Math.random().toString(),
        emptyText: 'No collaborators on this project.',
        columns: [
          { title: 'Name', dataIndex: 'fullName', key: 'fullName', width: 220, resizable: true },
          { title: 'Username', dataIndex: 'userName', key: 'userName', width: 160 },
          { title: 'Email', dataIndex: 'email', key: 'email', width: 260, resizable: true },
        ] as DominoColumnType<Collaborator>[],
      },
      {
        title: 'Goals',
        rows: entities.goals,
        rowKey: (r: Goal) => r.id ?? Math.random().toString(),
        emptyText: 'No goals defined for this project.',
        columns: [
          { title: 'Title', dataIndex: 'title', key: 'title', width: 260, resizable: true },
          { title: 'Description', dataIndex: 'description', key: 'description', width: 360, resizable: true },
          {
            title: 'Status',
            key: 'status',
            width: 120,
            render: (_: unknown, r: Goal) => (
              <Tag type={r.isComplete ? 'success' : 'user-generated'}>{r.isComplete ? 'Complete' : 'Open'}</Tag>
            ),
          },
        ] as DominoColumnType<Goal>[],
      },
    ]
  }, [entities])

  if (error) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Typography.H1>Domino Frontend</Typography.H1>
        <Typography.Text type="BodyDefaultStrong">Could not load project context</Typography.Text>
        <div style={{ marginTop: 8 }}>
          <Typography.Text>{error}</Typography.Text>
        </div>
      </div>
    )
  }

  if (!project || !entities) {
    return (
      <div style={{ padding: '24px 0' }}>
        <SpinnerWrapper />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.H1>{project.name}</Typography.H1>
          <Space size="small" style={{ marginTop: 4 }}>
            <Tag type="user-generated">{project.owner}</Tag>
            {project.visibility && <Tag type="user-generated">{project.visibility}</Tag>}
            {project.mainRepository?.name && <Tag type="user-generated">{project.mainRepository.name}</Tag>}
          </Space>
          {project.description && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text>{project.description}</Typography.Text>
            </div>
          )}
        </div>

        <Row gutter={[16, 16]}>
          {sections.map((s) => (
            <Col xs={24} xl={12} key={s.title}>
              <EntitySection {...(s as SectionProps<unknown>)} />
            </Col>
          ))}
        </Row>
      </Space>
    </div>
  )
}

export default App
