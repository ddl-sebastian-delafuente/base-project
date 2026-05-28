import { useState } from 'react'
import {
  Button,
  Card,
  Row,
  Col,
  Space,
  Tag,
  Typography,
} from '@dominodatalab/extensions-tools'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography>
            <h1 style={{ marginBottom: 8 }}>Domino Frontend</h1>
            <p style={{ margin: 0 }}>
              A Vite + React + TypeScript starter wired up to the Domino design system.
            </p>
          </Typography>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Getting started">
              <p>
                This app uses <code>@dominodatalab/extensions-tools</code>. Components
                rendered here (Button, Card, Row/Col, Space, Tag, Typography) all flow
                through the Domino theme provider configured in <code>src/main.tsx</code>.
              </p>
              <Space>
                <Button type="primary" onClick={() => setCount((c) => c + 1)}>
                  Clicked {count} times
                </Button>
                <Button onClick={() => setCount(0)}>Reset</Button>
              </Space>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Next steps">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Tag>React 18</Tag>{' '}
                  <Tag>Vite</Tag>{' '}
                  <Tag>react-router 5</Tag>{' '}
                  <Tag color="blue">Domino</Tag>
                </div>
                <p style={{ margin: 0 }}>
                  Edit <code>src/App.tsx</code> to start building. Component props can
                  be looked up via the Storybook MCP — see <code>CLAUDE.md</code>.
                </p>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  )
}

export default App
