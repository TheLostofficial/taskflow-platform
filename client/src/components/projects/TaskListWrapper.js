import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spinner, Alert } from 'react-bootstrap';
import { fetchProjectTasks, clearTasks, updateLastFetchTime } from '../../store/slices/tasksSlice';
import TaskList from './TaskList';

const TaskListWrapper = ({ project, canEdit }) => {
  const dispatch = useDispatch();
  const { 
    currentProjectId, 
    items: tasks, 
    loading, 
    error
  } = useSelector(state => state.tasks || {});

  useEffect(() => {
    if (!project?._id) return;
    
    // Загружаем задачи только если это другой проект или задачи еще не загружены
    if (currentProjectId !== project._id || tasks.length === 0) {
      console.log(`🔄 TaskListWrapper: Загрузка задач для проекта ${project._id}`);
      dispatch(fetchProjectTasks(project._id));
      dispatch(updateLastFetchTime());
    }
    
    return () => {
      // Очищаем задачи только если уходим с этой страницы
      if (currentProjectId === project._id) {
        dispatch(clearTasks());
      }
    };
  }, [project?._id, currentProjectId, dispatch, tasks.length]);

  if (!project?._id) {
    return (
      <Alert variant="warning">
        Проект не загружен. Невозможно отобразить задачи.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Ошибка загрузки задач</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Загрузка задач...</p>
      </div>
    );
  }

  return (
    <TaskList 
      project={project} 
      canEdit={canEdit}
    />
  );
};

export default TaskListWrapper;