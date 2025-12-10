import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spinner, Alert } from 'react-bootstrap';
import { fetchProjectTasks, clearTasks, clearProjectTasks, updateLastFetchTime } from '../../store/slices/tasksSlice';
import TaskList from './TaskList';

const TaskListWrapper = ({ project, canEdit }) => {
  const dispatch = useDispatch();
  const { 
    currentProjectId, 
    items: tasks, 
    loading, 
    error,
    lastFetchTime,
    loadedProjects
  } = useSelector(state => state.tasks || {});

  // Проверяем, нужно ли загружать задачи
  useEffect(() => {
    if (!project?._id) return;
    
    const shouldFetchTasks = () => {
      // Если еще не загружали задачи для этого проекта
      if (currentProjectId !== project._id) return true;
      
      // Если задачи уже загружены для этого проекта
      if (loadedProjects[project._id]) {
        const cacheAge = Date.now() - loadedProjects[project._id].timestamp;
        // Обновляем если кэш старше 30 секунд
        return cacheAge > 30000;
      }
      
      return true;
    };
    
    // Проверяем частоту запросов (не чаще чем раз в 5 секунд)
    const timeSinceLastFetch = lastFetchTime ? Date.now() - lastFetchTime : Infinity;
    const isTooFrequent = timeSinceLastFetch < 5000;
    
    if (shouldFetchTasks() && !isTooFrequent) {
      console.log(`🔄 TaskListWrapper: Загрузка задач для проекта ${project._id}`);
      
      if (currentProjectId && currentProjectId !== project._id) {
        dispatch(clearProjectTasks(currentProjectId));
      }
      
      dispatch(fetchProjectTasks(project._id));
      dispatch(updateLastFetchTime());
    } else if (isTooFrequent) {
      console.log(`⏸️ TaskListWrapper: Пропускаем загрузку, слишком частые запросы`);
    } else {
      console.log(`📊 TaskListWrapper: Используем кэшированные задачи для проекта ${project._id}`);
    }
    
    return () => {
      // Не очищаем задачи при размонтировании, если это тот же проект
      if (project._id && currentProjectId !== project._id) {
        dispatch(clearTasks());
      }
    };
  }, [project?._id, currentProjectId, dispatch, lastFetchTime, loadedProjects]);

  // Если проект не загружен
  if (!project?._id) {
    return (
      <Alert variant="warning">
        Проект не загружен. Невозможно отобразить задачи.
      </Alert>
    );
  }

  // Обработка ошибок
  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Ошибка загрузки задач</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex gap-2 mt-3">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              dispatch(fetchProjectTasks(project._id));
              dispatch(updateLastFetchTime());
            }}
          >
            Повторить попытку
          </button>
        </div>
      </Alert>
    );
  }

  // Отображение загрузки
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
      key={`tasklist-wrapper-${project._id}`}
    />
  );
};

export default TaskListWrapper;