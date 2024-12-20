Extension { #name : #Vector }

{ #category : #'*SqueakXR-helpers' }
Vector >> asJSArgument [

	^ Object asJSArgument
]

{ #category : #'*SqueakXR-helpers' }
Vector >> asVector [

	^ self
]

{ #category : #'*SqueakXR-helpers' }
Vector class >> componentSelectors [

	^ #()
]

{ #category : #'*SqueakXR-helpers' }
Vector >> doesNotUnderstand: aMessage [

	(self class selectorOnlyContainsComponents: aMessage selector)
		ifFalse: [^ super doesNotUnderstand: aMessage].
	
	^ self swizzle: aMessage selector
]

{ #category : #'*SqueakXR-helpers' }
Vector class >> selectorOnlyContainsComponents: aSelector [

	^ aSelector allSatisfy: [:c | self componentSelectors includes: c asSymbol]
]

{ #category : #'*SqueakXR-helpers' }
Vector >> swizzle: aString [
	
	| vector |
	vector := (self class vectorClassForComponentNumber: aString size) new.
	aString selector withIndexDo: [:component :index |
		vector componentAt: index put: (self perform: component asSymbol)].
	^ vector
]

{ #category : #'*SqueakXR-helpers' }
Vector class >> vectorClassForComponentNumber: aNumber [

	self assert: aNumber > 1.
	aNumber = 2 ifTrue: [^ Vector2].
	aNumber = 3 ifTrue: [^ Vector3].
	aNumber = 4 ifTrue: [^ Vector4].
	self error: 'numbers above 4 not yet handled'
]
