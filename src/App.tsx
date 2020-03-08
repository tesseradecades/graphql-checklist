import React from 'react';
import { useMutation,useQuery} from '@apollo/react-hooks';
import {gql} from 'apollo-boost';

interface Todo{
  id: string;
  done: boolean;
  text: string;
}

interface TodoData{
  todos: Todo[];
}

const ADD_TODO = gql`
  mutation addTodo($text: String!) {
    __typename
    insert_todos(objects: {text: $text}) {
      returning {
        done
        id
        text
      }
    }
  }
`;

const DELETE_TODO = gql`
  mutation deleteTodo($id: uuid!) {
    delete_todos(where: {id: {_eq: $id}}) {
      returning {
        done
        id
        text
      }
    }
  }
`;

const GET_TODOS = gql`
  query getTodos {
    todos {
      done
      id
      text
    }
  }
`;

const TOGGLE_TODO = gql`
  mutation toggleTodo($id: uuid!, $done: Boolean!) {
    update_todos(where: {id: {_eq: $id }}, _set: {done: $done}) {
      returning {
        done
        id
        text
      }
    }
  }
`;

//list todos
//add todos
//toggle todos
//delete todos
function App() {
  const [todoText, setTodoText] = React.useState('');
  const {data, loading, error} = useQuery<TodoData>(GET_TODOS);
  const [addTodo] = useMutation(ADD_TODO,{
    onCompleted: ()=>setTodoText('')
  });
  const [deleteTodo] = useMutation(DELETE_TODO);
  const [toggleTodo] = useMutation(TOGGLE_TODO);

  if(error){ return (<div>error fetching todos...</div>)}
  if(loading){ return (<div>loading...</div>)}

  async function handleAddTodo(event: React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!todoText.trim()){return;}
    const data = await addTodo({
      variables: {text:todoText},
      /*
      Tell Apollo's client to make another request tp update the cached 
      values for the GET_TODOS query. Here we want to update the data 
      with the contents of the database because when creating a new 
      todo, we don't know what it's id will be, and including logic to 
      determine its done value would be uncohesive and duplicated 
      logic. Instead, by just updating the cache with the db's values,
      everything will be up to date.
      */
      refetchQueries: [{query: GET_TODOS}]
    });
    console.log('Added todo', data);
  }

  async function handleDeleteTodo({id, text}: Todo){
    const confirmation = window.confirm(`Do you want to delete this todo?\n${text}`);
    if(confirmation){
      const data = await deleteTodo({
        variables: {id},
        /*
        Update Apollo's cache with the expected values for GET_TODOS 
        query. This allows us to avoid making another Http Request to 
        the database, since when deleting a todo, we already know 
        exactly what should happen to the cache.
        note:
        In the event that some other user somewhere else were to access 
        the same db table that the GET_TODOS query pulls from, this 
        method would not reflect deletions that user instigates. Thus 
        the cache would show todos that may not actually exist in the 
        db anymore. This is the advantage of using graphQL's
        subscriptions or Apollo's refetchQueries feature, since the 
        cache will always be reflective of the database.
        */
        update: cache =>{
          const prevData: TodoData = cache.readQuery({query: GET_TODOS}) as TodoData;
          const newTodos = prevData.todos.filter(todo=> todo.id !== id);
          cache.writeQuery({ query: GET_TODOS, data: {todos: newTodos}})
        }
      });
      console.log('Deleted todo', data);
    }
  }

  async function handleToggleTodo({id, done}: Todo){
    const data = await toggleTodo({variables: {id, done: !done}});
    console.log(data);
    console.log('Toggled todo', data);
  }

  return (
    <div className="vh-100 code flex flex-column items-center bg-purple white pa3 fl-1">
      <h1 className="f2-l">
        GraphQL Checklist
        <span role="img" aria-label="Checkmark">
           ✅
        </span>
      </h1>
      {/* Todo form */}
      <form onSubmit={handleAddTodo} className="mb3">
        <input
          className="pa2 f4 b--dashed"
          type="text"
          onChange={event=>setTodoText(event.target.value)}
          placeholder="Type your todo"
          value={todoText}
        />
        <button 
          className="pa2 f4 bg-green"
          type="submit">
          Create
        </button>
      </form>
      {/*Todo List*/}
      <div className="flex items-center justify-center flex-column">
        {data && data.todos.map(todo=>(
        <p key={todo.id} onDoubleClick={()=>handleToggleTodo(todo)}>
          <span className={`pointer list pa1 f3 ${todo.done && 'strike'}`}>
            {todo.text}
          </span>
          <button className="bg-transparent bn f4" onClick={() => handleDeleteTodo(todo)}>
            <span className="red">&times;</span>
          </button>
        </p>
        ))}
      </div>
    </div>
  );
}

export default App;