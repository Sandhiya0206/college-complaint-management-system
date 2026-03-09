import { createContext, useContext, useReducer, useCallback } from 'react'

const ComplaintContext = createContext(null)

const initialState = {
  complaints: [],
  selectedComplaint: null,
  filters: {
    status: '',
    category: '',
    priority: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  },
  pagination: { page: 1, pages: 1, total: 0 },
  isLoading: false,
  error: null
}

const complaintReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_COMPLAINTS':
      return { ...state, complaints: action.payload, isLoading: false }
    case 'SET_PAGINATION':
      return { ...state, pagination: action.payload }
    case 'ADD_COMPLAINT':
      return { ...state, complaints: [action.payload, ...state.complaints] }
    case 'UPDATE_COMPLAINT':
      return {
        ...state,
        complaints: state.complaints.map(c =>
          (c._id || c.id) === (action.payload._id || action.payload.id) ? { ...c, ...action.payload } : c
        )
      }
    case 'SET_SELECTED':
      return { ...state, selectedComplaint: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    default:
      return state
  }
}

export const ComplaintProvider = ({ children }) => {
  const [state, dispatch] = useReducer(complaintReducer, initialState)

  const addComplaint = useCallback((complaint) => {
    dispatch({ type: 'ADD_COMPLAINT', payload: complaint })
  }, [])

  const updateComplaint = useCallback((complaint) => {
    dispatch({ type: 'UPDATE_COMPLAINT', payload: complaint })
  }, [])

  return (
    <ComplaintContext.Provider value={{ ...state, dispatch, addComplaint, updateComplaint }}>
      {children}
    </ComplaintContext.Provider>
  )
}

export const useComplaintContext = () => {
  const context = useContext(ComplaintContext)
  if (!context) throw new Error('useComplaintContext must be used within ComplaintProvider')
  return context
}

export default ComplaintContext
