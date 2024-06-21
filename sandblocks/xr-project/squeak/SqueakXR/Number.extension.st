Extension { #name : #Number }

{ #category : #'*SqueakXR-Core' }
Number >> asCSSUnit: aString [

	^ self asString, aString
]

{ #category : #'*SqueakXR-Core' }
Number >> cm [

	^ self * 0.01
]

{ #category : #'*SqueakXR-Core' }
Number >> dm [

	^ self * 0.1
]

{ #category : #'*SqueakXR-Core' }
Number >> km [

	^ self * 1000
]

{ #category : #'*SqueakXR-Core' }
Number >> m [

	^ self
]

{ #category : #'*SqueakXR-Core' }
Number >> mm [

	^ self * 0.001
]

{ #category : #'*SqueakXR-Core' }
Number >> px [

	^ self asCSSUnit: 'px'
]
