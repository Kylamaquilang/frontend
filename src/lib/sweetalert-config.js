// Global SweetAlert2 configuration for smaller alerts
import Swal from 'sweetalert2';

// Set global default configuration for smaller alerts
Swal.mixin({
  customClass: {
    popup: 'swal2-popup-small',
    title: 'swal2-title-small',
    content: 'swal2-content-small',
    confirmButton: 'swal2-confirm-small',
    cancelButton: 'swal2-cancel-small',
    actions: 'swal2-actions-small'
  },
  width: '320px',
  padding: '1rem',
  showConfirmButton: true,
  showCancelButton: false,
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  confirmButtonColor: '#000C50',
  cancelButtonColor: '#6B7280',
  buttonsStyling: true,
  allowOutsideClick: true,
  allowEscapeKey: true,
  showCloseButton: false,
  timer: null,
  timerProgressBar: false,
  backdrop: true,
  allowEnterKey: true,
  stopKeydownPropagation: true,
  keydownListenerCapture: false,
  html: false,
  preConfirm: null,
  returnInputValueOnDeny: false,
  didOpen: null,
  didClose: null,
  willOpen: null,
  willClose: null,
  didDestroy: null,
  didRender: null,
  reverseButtons: false,
  focusConfirm: true,
  focusCancel: false,
  focusDeny: false,
  focusDeny: false,
  returnFocus: true,
  heightAuto: true,
  grow: false,
  position: 'center',
  target: 'body',
  backdrop: true,
  animation: true,
  showClass: {
    popup: 'swal2-show',
    backdrop: 'swal2-backdrop-show',
    icon: 'swal2-icon-show'
  },
  hideClass: {
    popup: 'swal2-hide',
    backdrop: 'swal2-backdrop-hide',
    icon: 'swal2-icon-hide'
  }
});

// Export configured Swal for use throughout the app
export default Swal;





