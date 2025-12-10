export const testServerConnection = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log('✅ Server connection test:', data);
    return true;
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    return false;
  }
};

export const testApiConnection = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ API connection test:', response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    return false;
  }
};