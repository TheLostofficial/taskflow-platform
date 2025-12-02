import React from 'react';
import { Nav, Tab, Row, Col } from 'react-bootstrap';

import ProjectOverview from './ProjectOverview';
import TaskList from './TaskList';
import ProjectMembers from './ProjectMembers';
import ProjectSettings from './ProjectSettings';

const ProjectTabs = ({ activeTab, onTabChange, project, projectId, user, tasks, tasksLoading }) => {
  const isOwner = project.owner._id === user?._id;
  const isAdmin = project.members.some(member => 
    member.user._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );
  const canEdit = project.members.some(member => 
    member.user._id === user?._id && 
    member.permissions.canEdit
  );

  const tabs = [
    {
      key: 'overview',
      title: 'Обзор',
      component: <ProjectOverview project={project} tasks={tasks} tasksLoading={tasksLoading} />
    },
    {
      key: 'tasks',
      title: 'Задачи',
      component: <TaskList project={project} canEdit={canEdit} tasks={tasks} tasksLoading={tasksLoading} />
    },
    {
      key: 'members',
      title: 'Участники',
      component: <ProjectMembers project={project} isOwner={isOwner} isAdmin={isAdmin} />
    }
  ];

  if (isOwner || isAdmin) {
    tabs.push({
      key: 'settings',
      title: 'Настройки',
      component: <ProjectSettings project={project} />
    });
  }

  return (
    <Tab.Container activeKey={activeTab} onSelect={onTabChange}>
      <Row>
        <Col>
          <Nav variant="tabs" className="mb-4">
            {tabs.map(tab => (
              <Nav.Item key={tab.key}>
                <Nav.Link eventKey={tab.key}>{tab.title}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>

          <Tab.Content>
            {tabs.map(tab => (
              <Tab.Pane key={tab.key} eventKey={tab.key}>
                {tab.component}
              </Tab.Pane>
            ))}
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  );
};

export default ProjectTabs;