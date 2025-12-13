import React from 'react';
import { Container, Card, Accordion, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HelpPage = () => {
  const faqs = [
    {
      question: 'Как создать проект?',
      answer: 'Перейдите на страницу "Проекты" и нажмите кнопку "Создать проект". Заполните название и описание, выберите настройки видимости.'
    },
    {
      question: 'Как пригласить участников?',
      answer: 'В настройках проекта перейдите в раздел "Участники" и создайте инвайт. Отправьте ссылку-приглашение участникам.'
    },
    {
      question: 'Как создать задачу?',
      answer: 'Внутри проекта нажмите "Добавить задачу". Укажите название, описание, приоритет и срок выполнения.'
    },
    {
      question: 'Как изменить настройки профиля?',
      answer: 'Нажмите на свое имя в правом верхнем углу → "Мой профиль". Там вы можете изменить имя, аватар, настройки уведомлений и пароль.'
    },
    {
      question: 'Что делать, если не получается войти?',
      answer: 'Проверьте правильность email и пароля. Если забыли пароль, используйте функцию "Восстановить пароль" на странице входа.'
    }
  ];

  return (
    <Container className="py-5">
      <h1 className="mb-4">Помощь и поддержка</h1>
      
      <Card className="shadow mb-4">
        <Card.Body>
          <h5>📚 Быстрые ссылки</h5>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <Button as={Link} to="/profile" variant="outline-primary">
              👤 Мой профиль
            </Button>
            <Button as={Link} to="/projects" variant="outline-primary">
              📁 Мои проекты
            </Button>
            <Button as={Link} to="/dashboard" variant="outline-primary">
              📊 Дашборд
            </Button>
            <Button 
              href="mailto:support@taskflow.com" 
              variant="outline-success"
            >
              📧 Написать в поддержку
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow mb-4">
        <Card.Body>
          <h5 className="mb-3">❓ Часто задаваемые вопросы</h5>
          <Accordion>
            {faqs.map((faq, index) => (
              <Accordion.Item eventKey={index.toString()} key={index}>
                <Accordion.Header>{faq.question}</Accordion.Header>
                <Accordion.Body>{faq.answer}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card.Body>
      </Card>

      <Card className="shadow">
        <Card.Body>
          <h5>📞 Контакты поддержки</h5>
          <ul className="list-unstyled mt-3">
            <li className="mb-2">
              <strong>Email:</strong> support@taskflow.com
            </li>
            <li className="mb-2">
              <strong>Телеграм:</strong> @taskflow_support
            </li>
            <li>
              <strong>Время работы:</strong> Пн-Пт, 9:00-18:00
            </li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HelpPage;