import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword, clearError, clearSuccess } from '../../store/slices/authSlice';

const PasswordChangeForm = () => {
  const dispatch = useDispatch();
  const { profileLoading, error, success } = useSelector(state => state.auth);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());
    dispatch(clearSuccess());

    if (!currentPassword || !newPassword || !confirmPassword) {
      setLocalError('Все поля обязательны для заполнения');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Новые пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      await dispatch(changePassword({
        currentPassword,
        newPassword
      })).unwrap();
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
    }
  };

  const displayError = error || localError;

  return (
    <div>
      <h5>Смена пароля</h5>
      
      {displayError && (
        <Alert variant="danger" onClose={() => { 
          setLocalError(''); 
          dispatch(clearError()); 
        }} dismissible>
          {displayError}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => dispatch(clearSuccess())} dismissible>
          {success}
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Текущий пароль</Form.Label>
          <Form.Control
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={profileLoading}
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Новый пароль</Form.Label>
          <Form.Control
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={profileLoading}
          />
          <Form.Text className="text-muted">
            Минимум 6 символов
          </Form.Text>
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Label>Подтвердите новый пароль</Form.Label>
          <Form.Control
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={profileLoading}
          />
        </Form.Group>
        
        <Button 
          variant="primary" 
          type="submit" 
          disabled={profileLoading}
        >
          {profileLoading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Изменение...
            </>
          ) : 'Сменить пароль'}
        </Button>
      </Form>
    </div>
  );
};

export default PasswordChangeForm;