export const loginUser = async (email: string, password: string): Promise<{ access: string; refresh: string }> => {
    const response = await fetch('https://hiroki-jiujitsu.azurewebsites.net/api/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }
  
    return response.json();
  };
  