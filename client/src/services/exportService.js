import { saveAs } from 'file-saver';

export const exportService = {
  exportTasksToCSV(tasks, projectName = 'project') {
    if (!tasks || tasks.length === 0) {
      throw new Error('Нет задач для экспорта');
    }

    const headers = [
      'ID',
      'Название',
      'Описание',
      'Статус',
      'Приоритет',
      'Исполнитель',
      'Создатель',
      'Срок выполнения',
      'Дата создания',
      'Дата обновления',
      'Кол-во комментариев',
      'Кол-во вложений'
    ];

    const rows = tasks.map(task => [
      task._id || '',
      `"${(task.title || '').replace(/"/g, '""')}"`,
      `"${(task.description || '').replace(/"/g, '""')}"`,
      task.status || '',
      task.priority || '',
      task.assignee?.name || 'Не назначен',
      task.creator?.name || '',
      task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : '',
      task.createdAt ? new Date(task.createdAt).toLocaleDateString('ru-RU') : '',
      task.updatedAt ? new Date(task.updatedAt).toLocaleDateString('ru-RU') : '',
      task.comments?.length || 0,
      task.attachments?.length || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_tasks_${new Date().toISOString().split('T')[0]}.csv`;
    
    saveAs(blob, filename);
  },

  exportTasksToJSON(tasks, projectName = 'project') {
    if (!tasks || tasks.length === 0) {
      throw new Error('Нет задач для экспорта');
    }

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        projectName: projectName,
        totalTasks: tasks.length,
        formatVersion: '1.0'
      },
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee ? {
          id: task.assignee._id,
          name: task.assignee.name,
          email: task.assignee.email
        } : null,
        creator: {
          id: task.creator._id,
          name: task.creator.name,
          email: task.creator.email
        },
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        comments: task.comments?.length || 0,
        attachments: task.attachments?.length || 0,
        checklist: task.checklist || [],
        labels: task.labels || []
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const filename = `${projectName.replace(/[^a-z0-9]/gi, '_')}_tasks_${new Date().toISOString().split('T')[0]}.json`;
    
    saveAs(blob, filename);
  },

  exportProjectData(project, tasks, comments = []) {
    if (!project) {
      throw new Error('Проект не найден');
    }

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportType: 'full_project',
        formatVersion: '1.0'
      },
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        owner: project.owner,
        members: project.members,
        settings: project.settings,
        tags: project.tags,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      tasks: tasks || [],
      comments: comments || [],
      statistics: {
        totalTasks: tasks?.length || 0,
        totalComments: comments?.length || 0,
        membersCount: project.members?.length || 1
      }
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_full_export_${new Date().toISOString().split('T')[0]}.json`;
    
    saveAs(blob, filename);
  },

  exportUserData(user, projects, tasks) {
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportType: 'user_data',
        formatVersion: '1.0'
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        skills: user.skills,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      projects: projects?.map(p => ({
        id: p._id,
        name: p.name,
        role: p.members?.find(m => m.user._id === user._id)?.role || 'unknown',
        status: p.status,
        memberSince: p.members?.find(m => m.user._id === user._id)?.joinedAt
      })) || [],
      tasks: tasks?.map(t => ({
        id: t._id,
        title: t.title,
        projectId: t.project,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt
      })) || []
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const filename = `user_${user.name.replace(/[^a-z0-9]/gi, '_')}_data_${new Date().toISOString().split('T')[0]}.json`;
    
    saveAs(blob, filename);
  }
};

export default exportService;