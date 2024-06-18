"
This is a helper class that wraps a JSObjectProxy of a JS array. This enables you to use the collection protocol on such an array. Eventually, this class should become obsolete because we can perform these operations directly on the JS array itself.
"
Class {
	#name : #JSArrayWrapper,
	#superclass : #SequenceableCollection,
	#instVars : [
		'jsObject'
	],
	#category : #'SqueakXR-Core'
}

{ #category : #'as yet unclassified' }
JSArrayWrapper class >> from: aJSObject [

	^ self new jsObject: aJSObject
]

{ #category : #'as yet unclassified' }
JSArrayWrapper >> at: anInteger [

	^ self jsObject at: anInteger - 1
]

{ #category : #'as yet unclassified' }
JSArrayWrapper >> jsObject [

	^ jsObject
]

{ #category : #'as yet unclassified' }
JSArrayWrapper >> jsObject: aJSObject [

	jsObject := aJSObject
]

{ #category : #'as yet unclassified' }
JSArrayWrapper >> size [

	^ self jsObject length
]
