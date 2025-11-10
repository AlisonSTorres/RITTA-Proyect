import Joi from 'joi';

/**
 * Schema para validar el código QR
 * Debe ser un string de exactamente 6 dígitos numéricos
 */
const qrCodeValidator = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.pattern.base': 'El código QR debe tener exactamente 6 dígitos numéricos',
    'any.required': 'El código QR es obligatorio',
    'string.empty': 'El código QR no puede estar vacío'
  });

/**
 * Schema para obtener info de QR
 * GET /api/withdrawals/inspector/qr/:qrCode/info
 */
export const getQrInfoSchema = {
  params: Joi.object({
    qrCode: qrCodeValidator
  })
};

/**
 * Schema para procesar QR
 * POST /api/withdrawals/inspector/qr/process
 */
export const processQrSchema = {
  body: Joi.object({
    qrCode: qrCodeValidator,
    action: Joi.string()
      .valid('APPROVE', 'DENY')
      .required()
      .messages({
        'any.only': 'La acción debe ser APPROVE o DENY',
        'any.required': 'La acción es obligatoria'
      }),
    notes: Joi.string().max(500).optional().allow('')
  })
};

/**
 * Schema para autorización manual sin QR
 * POST /api/withdrawals/inspector/authorize-manual
 */
export const manualAuthorizationSchema = {
  body: Joi.object({
    studentId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El ID del estudiante debe ser un número',
        'number.integer': 'El ID del estudiante debe ser un número entero',
        'number.positive': 'El ID del estudiante debe ser positivo',
        'any.required': 'El ID del estudiante es obligatorio'
      }),
    

    reasonId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El ID del motivo debe ser un número',
        'number.integer': 'El ID del motivo debe ser un número entero',
        'number.positive': 'El ID del motivo debe ser positivo',
        'any.required': 'El motivo de retiro es obligatorio'
      }),
    

    customReason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'El motivo personalizado no puede exceder 500 caracteres'
      }),

    delegateId: Joi.number()
      .integer()
      .positive()
      .messages({
        'number.base': 'El ID del delegado debe ser un número',
        'number.integer': 'El ID del delegado debe ser un número entero',
        'number.positive': 'El ID del delegado debe ser positivo'
      }),

    manualDelegate: Joi.object({
      name: Joi.string()
        .trim()
        .min(1)
        .max(150)
        .required()
        .messages({
          'string.empty': 'El nombre del delegado es obligatorio',
          'string.max': 'El nombre del delegado no puede exceder 150 caracteres'
        }),
      rut: Joi.string()
        .pattern(/^\d{7,8}-[\dkK]$/)
        .required()
        .messages({
          'string.pattern.base': 'El RUT del delegado debe tener formato válido (12345678-9)',
          'any.required': 'El RUT del delegado es obligatorio'
        }),
      phone: Joi.string()
        .pattern(/^\d{8,15}$/)
        .required()
        .messages({
          'string.pattern.base': 'El teléfono del delegado debe contener entre 8 y 15 dígitos',
          'any.required': 'El teléfono del delegado es obligatorio'
        }),
      relationshipToStudent: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .messages({
          'string.empty': 'El parentesco del delegado es obligatorio',
          'string.max': 'El parentesco del delegado no puede exceder 100 caracteres'
        })
    })
      .optional(),

    unregisteredDelegateReason: Joi.string()
      .max(500)
      .when('manualDelegate', {
        is: Joi.exist(),
        then: Joi.string()
          .max(500)
          .required()
          .messages({
            'any.required': 'Debes indicar la razón para autorizar un delegado no registrado',
            'string.max': 'La razón del delegado no registrado no puede exceder 500 caracteres'
          }),
        otherwise: Joi.string()
          .max(500)
          .optional()
          .allow('')
          .messages({
            'string.max': 'La razón del delegado no registrado no puede exceder 500 caracteres'
          })
      })
  })
    .xor('delegateId', 'manualDelegate')
    .with('manualDelegate', 'unregisteredDelegateReason')
};

/**
 * Schema para retiro manual con RUTs
 * POST /api/withdrawals/inspector/manual
 */
export const manualWithdrawalSchema = {
  body: Joi.object({
    studentRut: Joi.string()
      .pattern(/^\d{7,8}-[\dkK]$/)
      .required()
      .messages({
        'string.pattern.base': 'El RUT del estudiante debe tener formato válido (12345678-9)',
        'any.required': 'El RUT del estudiante es obligatorio'
      }),
    
    parentRut: Joi.string()
      .pattern(/^\d{7,8}-[\dkK]$/)
      .required()
      .messages({
        'string.pattern.base': 'El RUT del apoderado debe tener formato válido (12345678-9)',
        'any.required': 'El RUT del apoderado es obligatorio'
      }),
    
    reasonId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'El ID del motivo debe ser un número',
        'number.integer': 'El ID del motivo debe ser un número entero',
        'number.positive': 'El ID del motivo debe ser positivo',
        'any.required': 'El motivo de retiro es obligatorio'
      }),
    
    customReason: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'El motivo personalizado no puede exceder 500 caracteres'
      }),
    
    notes: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Las notas del inspector no pueden exceder 1000 caracteres'
      })
  })
};

/**
 * Schema para obtener historial con más filtros
 * GET /api/withdrawals/inspector/history
 */
export const getHistorySchema = {
  query: Joi.object({
    // Filtros de búsqueda
    studentId: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El ID del estudiante debe ser un número',
        'number.integer': 'El ID del estudiante debe ser un número entero',
        'number.positive': 'El ID del estudiante debe ser positivo'
      }),
    
    studentRut: Joi.string()
      .pattern(/^\d{7,8}-[\dkK]$/)
      .optional()
      .messages({
        'string.pattern.base': 'El RUT del estudiante debe tener formato válido (12345678-9)'
      }),
    
    status: Joi.string()
      .valid('APPROVED', 'DENIED')
      .optional()
      .messages({
        'any.only': 'El estado debe ser APPROVED o DENIED'
      }),
    
    method: Joi.string()
      .valid('QR', 'MANUAL')
      .optional()
      .messages({
        'any.only': 'El método debe ser QR o MANUAL'
      }),
    
    approverId: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'El ID del aprobador debe ser un número',
        'number.integer': 'El ID del aprobador debe ser un número entero',
        'number.positive': 'El ID del aprobador debe ser positivo'
      }),
    
    // Filtros de fecha
    startDate: Joi.date()
      .iso()
      .optional()
      .messages({
        'date.format': 'La fecha de inicio debe estar en formato ISO (YYYY-MM-DD)'
      }),
    
    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.format': 'La fecha de fin debe estar en formato ISO (YYYY-MM-DD)',
        'date.min': 'La fecha de fin debe ser posterior a la fecha de inicio'
      }),
    
    // Paginación
    limit: Joi.number()
      .integer()
      .min(1)
      .max(200)
      .default(50)
      .optional()
      .messages({
        'number.min': 'El límite debe ser al menos 1',
        'number.max': 'El límite no puede exceder 200'
      }),
    
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .optional()
      .messages({
        'number.min': 'El offset debe ser 0 o mayor'
      })
  })
};

/**
 * Schema para buscar estudiante por RUT
 * GET /api/withdrawals/inspector/student/:rut
 */
export const searchStudentSchema = {
  params: Joi.object({
    rut: Joi.string()
      .pattern(/^\d{7,8}-[\dkK]$/)
      .required()
      .messages({
        'string.pattern.base': 'El RUT debe tener formato válido (12345678-9)',
        'any.required': 'El RUT es obligatorio'
      })
  })
};

/**
 * Schema para estadísticas de inspector
 * GET /api/withdrawals/inspector/stats
 */
export const getStatsSchema = {
  query: Joi.object({
    period: Joi.string()
      .valid('TODAY', 'WEEK', 'MONTH', 'YEAR')
      .default('MONTH')
      .optional()
      .messages({
        'any.only': 'El período debe ser TODAY, WEEK, MONTH o YEAR'
      }),
    
    groupBy: Joi.string()
      .valid('DAY', 'WEEK', 'MONTH')
      .default('DAY')
      .optional()
      .messages({
        'any.only': 'El agrupamiento debe ser DAY, WEEK o MONTH'
      })
  })
};