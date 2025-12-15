import React from 'react';
import { Nav } from 'react-bootstrap';
import ProjectOverview from './ProjectOverview';
import TaskListWrapper from './TaskListWrapper';
import ProjectMembers from './ProjectMembers';
import ProjectSettings from './ProjectSettings';
import './ProjectTabs.css';

const ProjectTabs = ({ activeTab, onSelect, project, user }) => {
  console.log('🔍 ProjectTabs:', { 
    activeTab, 
    projectId: project?._id,
    userId: user?._id,
    isOwner: project?.owner?._id === user?._id
  });

  if (!project) {
    return (
      <div className="alert alert-warning">
        Проект не загружен
      </div>
    );
  }

  const isOwner = project?.owner?._id === user?._id;
  
  // Проверяем, является ли пользователь участником проекта
  const isMember = project?.members?.some(member => 
    member.user?._id === user?._id
  );
  
  // Проверяем, является ли пользователь администратором (owner или admin)
  const isAdmin = project?.members?.some(member => 
    member.user?._id === user?._id && 
    (member.role === 'owner' || member.role === 'admin')
  );

  // Может ли редактировать задачи (owner, admin, или member)
  const canEdit = project?.members?.some(member => 
    member.user?._id === user?._id && 
    ['owner', 'admin', 'member'].includes(member.role)
  );

  console.log('📊 ProjectTabs - Права:', { isOwner, isMember, isAdmin, canEdit });

  // Основные вкладки, доступные всем участникам
  const tabs = [
    {
      key: 'overview',
      title: 'Обзор',
      component: <ProjectOverview project={project} />,
      show: true // Всегда показываем обзор
    },
    {
      key: 'tasks',
      title: 'Задачи',
      component: <TaskListWrapper project={project} canEdit={canEdit} />,
      show: isMember || isOwner || project?.settings?.isPublic
    },
    {
      key: 'members',
      title: 'Участники',
      component: <ProjectMembers project={project} isOwner={isOwner} />,
      show: isMember || isOwner || project?.settings?.isPublic
    }
  ];

  // Вкладка настроек только для владельца и администраторов
  if (isOwner || isAdmin) {
    tabs.push({
      key: 'settings',
      title: 'Настройки',
      component: <ProjectSettings project={project} />,
      show: true
    });
  }

  // Фильтруем вкладки, которые нужно показать
  const visibleTabs = tabs.filter(tab => tab.show);

  console.log('📋 ProjectTabs - Видимые вкладки:', visibleTabs.map(t => t.key));

  return (
    <div className="mt-4">
      {visibleTabs.length > 0 ? (
        <>
          <Nav variant="tabs" activeKey={activeTab} onSelect={onSelect}>
            {visibleTabs.map(tab => (
              <Nav.Item key={tab.key}>
                <Nav.Link eventKey={tab.key}>
                  {tab.title}
                  {tab.key === 'tasks' && project.taskCount > 0 && (
                    <span className="badge bg-secondary ms-2">{project.taskCount}</span>
                  )}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          
          <div className="tab-content mt-3">
            {visibleTabs.map(tab => (
              <div 
                key={tab.key} 
                style={{ display: activeTab === tab.key ? 'block' : 'none' }}
              >
                {tab.component}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="alert alert-warning">
          У вас нет доступа к этому проекту. Обратитесь к владельцу проекта для получения доступа.
        </div>
      )}
    </div>
  );
};

export default ProjectTabs;