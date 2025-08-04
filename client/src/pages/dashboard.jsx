import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

const Dashboard = () =>{

    const navigate = useNavigate();
    const {token} = useAuth();

    useEffect(()=>{
        if(!token){
            navigate('/');
        }
    }, [token, navigate])

    return (
        <div>
            <p>hello
            </p>
        </div>
    )
}

export default Dashboard;