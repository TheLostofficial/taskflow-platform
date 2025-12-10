import React from 'react';
import { Nav, Tab } from 'react-bootstrap';
import ProjectOverview from './ProjectOverview';
import TaskList from './TaskList';
import ProjectMembers from './ProjectMembers';
import ProjectSettings from './ProjectSettings';

const ProjectTabs = ({ activeTab, onSelect, project, user }) => {
  const isOwner = project.owner?._id === user?._id;
  const isAdmin = project.members?.some(member => 
    member.user?._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );
  const canEdit = project.members?.some(member => 
    member.user?._id === user?._id && 
    member.permissions?.canEdit
  );

  const tabs = [
    {
      key: 'overview',
      title: 'Обзор',
      component: <ProjectOverview project={project} />
    },
    {
      key: 'tasks',
      title: 'Задачи',
      component: <TaskList project={project} canEdit={canEdit} />
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
    <div className="mt-4">
      <Nav variant="tabs" activeKey={activeTab} onSelect={onSelect}>
        {tabs.map(tab => (
          <Nav.Item key={tab.key}>
            <Nav.Link eventKey={tab.key}>{tab.title}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      
      <div className="tab-content mt-3">
        {tabs.map(tab => (
          <Tab.Pane key={tab.key} active={activeTab === tab.key}>
            {tab.component}
          </Tab.Pane>
        ))}
      </div>
    </div>
  );
};

export default ProjectTabs;