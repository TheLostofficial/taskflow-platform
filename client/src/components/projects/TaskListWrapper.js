import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { 
  fetchProjectTasks,
  setCurrentTask
} from '../../store/slices/tasksSlice';
import TaskList from './TaskList';

const TaskListWrapper = ({ project, canEdit }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { items: tasks = [], isLoading, error } = useSelector(state => state.tasks || { items: [] });
  
  useEffect(() => {
    if (id && project?._id) {
      dispatch(fetchProjectTasks(project._id));
    }
  }, [id, project?._id, dispatch]);

  const handleTaskClick = (task) => {
    dispatch(setCurrentTask(task));
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
        <p className="mt-3">Загрузка задач...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Ошибка загрузки задач: {error}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="alert alert-warning" role="alert">
        Проект не найден
      </div>
    );
  }

  return (
    <TaskList 
      tasks={tasks}
      project={project}
      canEdit={canEdit}
      onTaskClick={handleTaskClick}
    />
  );
};

export default TaskListWrapper;